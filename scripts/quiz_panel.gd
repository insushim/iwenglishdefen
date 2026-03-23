extends Control
## 영단어 4지선다 퀴즈 패널 (광고 대체)

signal quiz_correct(reward_type: String)
signal quiz_wrong(reward_type: String)

@onready var question_label: Label = $PanelBG/QuestionLabel
@onready var hint_label: Label = $PanelBG/HintLabel
@onready var btn1: Button = $PanelBG/Btn1
@onready var btn2: Button = $PanelBG/Btn2
@onready var btn3: Button = $PanelBG/Btn3
@onready var btn4: Button = $PanelBG/Btn4
@onready var result_label: Label = $PanelBG/ResultLabel
@onready var timer_bar: ProgressBar = $PanelBG/TimerBar

var current_quiz: Dictionary = {}
var reward_type: String = ""
var time_limit: float = 10.0
var time_remaining: float = 10.0
var quiz_active: bool = false

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	btn1.pressed.connect(func(): _check_answer(btn1.text))
	btn2.pressed.connect(func(): _check_answer(btn2.text))
	btn3.pressed.connect(func(): _check_answer(btn3.text))
	btn4.pressed.connect(func(): _check_answer(btn4.text))
	result_label.text = ""

func _process(delta):
	if not quiz_active:
		return
	time_remaining -= delta
	timer_bar.value = time_remaining
	if time_remaining <= 0:
		quiz_active = false
		_on_wrong()

func start_quiz(type: String):
	reward_type = type
	current_quiz = GameData.get_quiz_question()
	if current_quiz.is_empty():
		return

	quiz_active = true
	time_remaining = time_limit
	timer_bar.max_value = time_limit
	timer_bar.value = time_limit
	result_label.text = ""

	# 힌트
	if current_quiz["is_en_to_ko"]:
		hint_label.text = "🇺🇸 영어 → 🇰🇷 한국어 뜻은?"
	else:
		hint_label.text = "🇰🇷 한국어 → 🇺🇸 영어 단어는?"

	question_label.text = current_quiz["question"]

	var buttons = [btn1, btn2, btn3, btn4]
	for i in range(4):
		buttons[i].text = current_quiz["choices"][i]
		buttons[i].disabled = false
		# 스타일
		var style = StyleBoxFlat.new()
		style.bg_color = Color(0.15, 0.2, 0.35)
		style.border_color = Color(0.3, 0.5, 0.8)
		style.set_border_width_all(2)
		style.set_corner_radius_all(10)
		style.content_margin_left = 10
		style.content_margin_right = 10
		style.content_margin_top = 12
		style.content_margin_bottom = 12
		buttons[i].add_theme_stylebox_override("normal", style)

func _check_answer(selected: String):
	quiz_active = false
	var buttons = [btn1, btn2, btn3, btn4]
	for b in buttons:
		b.disabled = true

	if selected == current_quiz["correct"]:
		_on_correct(selected)
	else:
		_on_wrong()

	# 정답 하이라이트
	for b in buttons:
		if b.text == current_quiz["correct"]:
			var correct_style = StyleBoxFlat.new()
			correct_style.bg_color = Color(0, 0.6, 0, 0.8)
			correct_style.set_border_width_all(3)
			correct_style.border_color = Color.GREEN
			correct_style.set_corner_radius_all(10)
			correct_style.content_margin_left = 10
			correct_style.content_margin_right = 10
			correct_style.content_margin_top = 12
			correct_style.content_margin_bottom = 12
			b.add_theme_stylebox_override("normal", correct_style)
			b.add_theme_stylebox_override("disabled", correct_style)

func _on_correct(selected: String):
	result_label.text = "✅ 정답! 보상을 받았습니다!"
	result_label.modulate = Color.GREEN
	GameData.total_words_correct += 1
	quiz_correct.emit(reward_type)

	# 1.5초 후 닫기
	await get_tree().create_timer(1.5).timeout
	visible = false
	_apply_reward()

func _on_wrong():
	result_label.text = "❌ 오답! 정답: " + current_quiz["correct"]
	result_label.modulate = Color.RED
	quiz_wrong.emit(reward_type)

	await get_tree().create_timer(2.0).timeout
	visible = false

func _apply_reward():
	var game = get_tree().current_scene
	match reward_type:
		"revive":
			if game and game.has_method("revive"):
				game.revive()
		"upgrade_reroll":
			if game and game.has_method("_show_upgrade_choices"):
				game._show_upgrade_choices()
		"double_coins":
			GameData.coins += 50
		"bonus_hp":
			if game:
				game.current_hp = min(game.current_hp + 3, game.max_hp)
		"shop_discount":
			pass  # 상점에서 처리
	GameData.save_data()

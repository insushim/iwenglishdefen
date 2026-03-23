extends Control
## 아이템 상점 - 기본 무기 영구 강화 (영단어 퀴즈로 할인)

@onready var coin_label: Label = $TopBar/CoinLabel
@onready var back_btn: Button = $TopBar/BackBtn
@onready var items_container: VBoxContainer = $ScrollContainer/ItemsContainer
@onready var quiz_panel: Control = $QuizPanel
@onready var discount_label: Label = $DiscountLabel

var has_discount: bool = false
var discount_rate: float = 0.5  # 50% 할인

var upgrade_items = [
	{"key": "base_damage_level", "name": "기본 공격력", "desc": "기본 데미지 +3", "icon": "⚔️"},
	{"key": "base_fire_rate_level", "name": "기본 연사력", "desc": "발사 속도 증가", "icon": "🔥"},
	{"key": "base_bullet_speed_level", "name": "기본 탄속", "desc": "총알 속도 +30", "icon": "💨"},
	{"key": "base_bullet_count_level", "name": "기본 멀티샷", "desc": "기본 총알 수 +1", "icon": "🔫"},
	{"key": "base_hp_level", "name": "기본 체력", "desc": "최대 HP +1", "icon": "❤️"},
	{"key": "base_crit_level", "name": "기본 크리티컬", "desc": "크리티컬 확률 +3%", "icon": "💥"},
]

func _ready():
	back_btn.pressed.connect(_on_back)
	quiz_panel.visible = false
	discount_label.visible = false

	if quiz_panel.has_signal("quiz_correct"):
		quiz_panel.quiz_correct.connect(_on_quiz_correct)

	_build_shop_ui()
	_update_coins()

func _build_shop_ui():
	# 할인 퀴즈 버튼
	var quiz_btn = Button.new()
	quiz_btn.text = "📝 영단어 퀴즈 풀고 50% 할인받기!"
	quiz_btn.custom_minimum_size = Vector2(0, 60)
	var quiz_style = StyleBoxFlat.new()
	quiz_style.bg_color = Color(0.1, 0.4, 0.2)
	quiz_style.border_color = Color(0.2, 0.8, 0.3)
	quiz_style.set_border_width_all(2)
	quiz_style.set_corner_radius_all(8)
	quiz_style.content_margin_left = 15
	quiz_style.content_margin_right = 15
	quiz_style.content_margin_top = 10
	quiz_style.content_margin_bottom = 10
	quiz_btn.add_theme_stylebox_override("normal", quiz_style)
	quiz_btn.pressed.connect(_on_quiz_btn)
	items_container.add_child(quiz_btn)

	# 구분선
	var sep = HSeparator.new()
	sep.custom_minimum_size = Vector2(0, 20)
	items_container.add_child(sep)

	# 업그레이드 아이템들
	for item in upgrade_items:
		var hbox = HBoxContainer.new()
		hbox.custom_minimum_size = Vector2(0, 80)

		var info_vbox = VBoxContainer.new()
		info_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_label = Label.new()
		var current_level = GameData.get(item["key"])
		name_label.text = item["icon"] + " " + item["name"] + " (Lv." + str(current_level) + ")"
		name_label.add_theme_font_size_override("font_size", 18)
		info_vbox.add_child(name_label)

		var desc_label = Label.new()
		desc_label.text = item["desc"]
		desc_label.add_theme_font_size_override("font_size", 13)
		desc_label.modulate = Color(0.7, 0.7, 0.7)
		info_vbox.add_child(desc_label)

		hbox.add_child(info_vbox)

		var buy_btn = Button.new()
		var cost = GameData.get_upgrade_cost(current_level)
		buy_btn.text = "🪙 " + str(cost)
		buy_btn.custom_minimum_size = Vector2(120, 50)
		var btn_style = StyleBoxFlat.new()
		btn_style.bg_color = Color(0.2, 0.15, 0.4)
		btn_style.border_color = Color(0.5, 0.3, 0.8)
		btn_style.set_border_width_all(2)
		btn_style.set_corner_radius_all(8)
		btn_style.content_margin_left = 10
		btn_style.content_margin_right = 10
		buy_btn.add_theme_stylebox_override("normal", btn_style)

		var item_key = item["key"]
		buy_btn.pressed.connect(func(): _buy_upgrade(item_key, buy_btn))
		buy_btn.name = "BuyBtn_" + item_key

		hbox.add_child(buy_btn)
		items_container.add_child(hbox)

func _buy_upgrade(key: String, btn: Button):
	var current_level = GameData.get(key)
	var cost = GameData.get_upgrade_cost(current_level)

	if has_discount:
		cost = int(cost * discount_rate)

	if GameData.coins < cost:
		# 코인 부족 - 퀴즈로 코인 획득 제안
		quiz_panel.visible = true
		quiz_panel.start_quiz("double_coins")
		return

	GameData.coins -= cost
	GameData.set(key, current_level + 1)
	GameData.save_data()

	# UI 새로고침
	for child in items_container.get_children():
		child.queue_free()
	_build_shop_ui()
	_update_coins()

func _on_quiz_btn():
	quiz_panel.visible = true
	quiz_panel.start_quiz("shop_discount")

func _on_quiz_correct(reward_type: String):
	if reward_type == "shop_discount":
		has_discount = true
		discount_label.visible = true
		discount_label.text = "🎉 50% 할인 적용중!"
		# UI 새로고침
		for child in items_container.get_children():
			child.queue_free()
		_build_shop_ui()

func _update_coins():
	coin_label.text = "🪙 " + str(GameData.coins)

func _on_back():
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")

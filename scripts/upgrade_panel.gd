extends Control
## 업그레이드 선택 패널 (레벨업/보물상자)

@onready var title_label: Label = $PanelBG/TitleLabel
@onready var choice1: Button = $PanelBG/Choice1
@onready var choice2: Button = $PanelBG/Choice2
@onready var choice3: Button = $PanelBG/Choice3

var current_choices: Array = []

# 모든 가능한 업그레이드
var all_upgrades = [
	{"id": "damage_up", "name": "공격력 증가", "desc": "데미지 +30%", "icon": "⚔️", "color": Color.RED},
	{"id": "fire_rate_up", "name": "연사 속도", "desc": "발사 속도 +15%", "icon": "🔥", "color": Color.ORANGE},
	{"id": "bullet_speed_up", "name": "탄속 증가", "desc": "총알 속도 +20%", "icon": "💨", "color": Color.CYAN},
	{"id": "bullet_count", "name": "멀티샷", "desc": "총알 +1개", "icon": "🔫", "color": Color(0.3, 0.8, 1)},
	{"id": "pierce", "name": "관통 알약", "desc": "관통 +1회", "icon": "🔱", "color": Color.PURPLE},
	{"id": "crit_up", "name": "치명타 강화", "desc": "크리티컬 확률 +10%", "icon": "💥", "color": Color.YELLOW},
	{"id": "homing", "name": "유도탄", "desc": "총알이 적을 추적", "icon": "🎯", "color": Color.GREEN},
	{"id": "chain_lightning", "name": "연쇄 사격", "desc": "주변 적에게 연쇄 데미지", "icon": "⚡", "color": Color(0.5, 0.5, 1)},
	{"id": "freeze", "name": "빙결탄", "desc": "적을 1.5초 동결", "icon": "❄️", "color": Color(0.6, 0.9, 1)},
	{"id": "poison", "name": "독 공격", "desc": "지속 독 데미지", "icon": "☠️", "color": Color(0.4, 0.9, 0.2)},
	{"id": "orbit", "name": "궤도 방어", "desc": "주변 회전 공격체 추가", "icon": "🛡️", "color": Color(0.3, 0.6, 1)},
	{"id": "heal", "name": "체력 회복", "desc": "HP +2 회복", "icon": "💚", "color": Color.GREEN},
	{"id": "max_hp_up", "name": "최대 체력 증가", "desc": "최대 HP +1", "icon": "❤️", "color": Color(1, 0.3, 0.5)},
]

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	choice1.pressed.connect(func(): _select(0))
	choice2.pressed.connect(func(): _select(1))
	choice3.pressed.connect(func(): _select(2))

func generate_choices():
	var available = all_upgrades.duplicate()
	available.shuffle()
	current_choices = available.slice(0, 3)

	title_label.text = "⬆ 속성 강화 ⬆"

	var buttons = [choice1, choice2, choice3]
	for i in range(3):
		var u = current_choices[i]
		buttons[i].text = u["name"] + "\n" + u["desc"]
		# 버튼 색상
		var style = StyleBoxFlat.new()
		style.bg_color = u["color"].darkened(0.6)
		style.border_color = u["color"]
		style.set_border_width_all(3)
		style.set_corner_radius_all(12)
		style.content_margin_left = 10
		style.content_margin_right = 10
		style.content_margin_top = 15
		style.content_margin_bottom = 15
		buttons[i].add_theme_stylebox_override("normal", style)
		var hover_style = style.duplicate()
		hover_style.bg_color = u["color"].darkened(0.3)
		buttons[i].add_theme_stylebox_override("hover", hover_style)
		buttons[i].add_theme_stylebox_override("pressed", hover_style)

func _select(index: int):
	if index >= current_choices.size():
		return
	var game = get_tree().current_scene
	if game and game.has_method("apply_upgrade"):
		game.apply_upgrade(current_choices[index]["id"])

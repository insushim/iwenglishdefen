extends Node2D
## 메인 게임 씬 스크립트

# 게임 상태
var current_hp: int = 5
var max_hp: int = 5
var score: int = 0
var wave: int = 1
var xp: int = 0
var xp_to_next_level: int = 10
var level: int = 1
var game_over: bool = false
var paused: bool = false
var kill_count: int = 0

# 인게임 업그레이드 (매 판 리셋)
var damage_mult: float = 1.0
var fire_rate_mult: float = 1.0
var bullet_speed_mult: float = 1.0
var bullet_count_bonus: int = 0
var pierce_count: int = 0
var crit_bonus: float = 0.0
var has_homing: bool = false
var has_chain_lightning: bool = false
var has_freeze: bool = false
var has_poison: bool = false
var orbit_count: int = 0
var shield_count: int = 0

# 타이머
var fire_timer: float = 0.0
var wave_timer: float = 0.0
var wave_interval: float = 15.0
var enemy_spawn_timer: float = 0.0
var enemy_spawn_interval: float = 2.0
var chest_timer: float = 0.0
var chest_interval: float = 20.0

# 노드 참조
@onready var heart_node: Node2D = $Heart
@onready var hp_bar: ProgressBar = $UI/HPBar
@onready var score_label: Label = $UI/ScoreLabel
@onready var wave_label: Label = $UI/WaveLabel
@onready var xp_bar: ProgressBar = $UI/XPBar
@onready var level_label: Label = $UI/LevelLabel
@onready var coin_label: Label = $UI/CoinLabel
@onready var upgrade_panel: Control = $UI/UpgradePanel
@onready var game_over_panel: Control = $UI/GameOverPanel
@onready var quiz_panel: Control = $UI/QuizPanel
@onready var bullet_container: Node2D = $BulletContainer
@onready var enemy_container: Node2D = $EnemyContainer
@onready var effect_container: Node2D = $EffectContainer
@onready var orbit_container: Node2D = $Heart/OrbitContainer

var center: Vector2
var viewport_size: Vector2

# 프리로드
var BulletScene = preload("res://scenes/bullet.tscn")
var EnemyScene = preload("res://scenes/enemy.tscn")
var ChestScene = preload("res://scenes/chest.tscn")
var DamageLabel = preload("res://scenes/damage_label.tscn")

func _ready():
	viewport_size = get_viewport_rect().size
	center = viewport_size / 2
	heart_node.position = center

	max_hp = GameData.get_base_max_hp()
	current_hp = max_hp
	hp_bar.max_value = max_hp
	hp_bar.value = current_hp

	update_ui()
	game_over_panel.visible = false
	upgrade_panel.visible = false
	quiz_panel.visible = false

	# 오빗 무기 초기화
	_update_orbits()

func _process(delta):
	if game_over or paused:
		return

	fire_timer += delta
	wave_timer += delta
	enemy_spawn_timer += delta
	chest_timer += delta

	# 자동 발사
	var fire_rate = GameData.get_base_fire_rate() * fire_rate_mult
	fire_rate = max(fire_rate, 0.05)  # 최소 발사 간격
	if fire_timer >= fire_rate:
		fire_timer = 0.0
		_fire_bullets()

	# 웨이브 진행
	if wave_timer >= wave_interval:
		wave_timer = 0.0
		wave += 1
		enemy_spawn_interval = max(0.3, 2.0 - wave * 0.1)
		update_ui()

	# 적 스폰
	if enemy_spawn_timer >= enemy_spawn_interval:
		enemy_spawn_timer = 0.0
		_spawn_enemy()

	# 보물상자 스폰
	if chest_timer >= chest_interval:
		chest_timer = 0.0
		_spawn_chest()

	# 오빗 무기 회전
	if orbit_container:
		orbit_container.rotation += delta * 2.0

func _fire_bullets():
	var total_bullets = GameData.get_base_bullet_count() + bullet_count_bonus
	var nearest_enemy = _get_nearest_enemy()

	if nearest_enemy == null:
		# 적이 없으면 사방으로 발사
		for i in range(total_bullets):
			var angle = (TAU / total_bullets) * i + randf() * 0.1
			_create_bullet(angle)
	else:
		# 가장 가까운 적 방향으로 발사
		var base_angle = center.angle_to_point(nearest_enemy.global_position) + PI
		if total_bullets == 1:
			_create_bullet(base_angle)
		else:
			var spread = deg_to_rad(15.0)
			for i in range(total_bullets):
				var offset = (i - (total_bullets - 1) / 2.0) * spread
				_create_bullet(base_angle + offset)

func _create_bullet(angle: float):
	var bullet = BulletScene.instantiate()
	bullet.position = center
	bullet.direction = Vector2.from_angle(angle)
	bullet.speed = GameData.get_base_bullet_speed() * bullet_speed_mult
	bullet.damage = GameData.get_base_damage() * damage_mult
	bullet.pierce = pierce_count
	bullet.is_homing = has_homing
	bullet.has_chain = has_chain_lightning
	bullet.has_freeze = has_freeze
	bullet.has_poison = has_poison

	# 크리티컬 판정
	var crit_chance = GameData.get_base_crit_chance() + crit_bonus
	if randf() < crit_chance:
		bullet.damage *= 2.0
		bullet.is_crit = true

	bullet_container.add_child(bullet)

func _get_nearest_enemy() -> Node2D:
	var nearest: Node2D = null
	var min_dist: float = INF
	for enemy in enemy_container.get_children():
		if not enemy is Node2D:
			continue
		var dist = center.distance_to(enemy.global_position)
		if dist < min_dist:
			min_dist = dist
			nearest = enemy
	return nearest

func _spawn_enemy():
	var enemy = EnemyScene.instantiate()
	# 화면 가장자리에서 스폰
	var angle = randf() * TAU
	var spawn_radius = max(viewport_size.x, viewport_size.y) * 0.6
	enemy.position = center + Vector2.from_angle(angle) * spawn_radius
	enemy.target = center
	enemy.hp = 20.0 + wave * 10.0
	enemy.max_hp = enemy.hp
	enemy.speed = 30.0 + wave * 2.0
	enemy.damage_value = int(enemy.hp)

	# 뱀형 체인 길이
	enemy.chain_length = min(3 + wave / 2, 12)

	enemy.died.connect(_on_enemy_died)
	enemy.reached_heart.connect(_on_enemy_reached_heart)
	enemy_container.add_child(enemy)

func _spawn_chest():
	var chest = ChestScene.instantiate()
	var angle = randf() * TAU
	var dist = randf_range(150, 300)
	chest.position = center + Vector2.from_angle(angle) * dist
	chest.opened.connect(_on_chest_opened)
	effect_container.add_child(chest)

func _on_enemy_died(enemy_pos: Vector2, xp_value: int, coin_value: int):
	xp += xp_value
	score += xp_value * 10
	kill_count += 1
	GameData.coins += coin_value

	# 데미지 숫자 표시
	_show_damage_number(enemy_pos, str(xp_value * 10), Color.YELLOW)

	# 레벨업 체크
	if xp >= xp_to_next_level:
		xp -= xp_to_next_level
		level += 1
		xp_to_next_level = int(xp_to_next_level * 1.3)
		_show_upgrade_choices()

	update_ui()

func _on_enemy_reached_heart():
	current_hp -= 1
	hp_bar.value = current_hp
	if current_hp <= 0:
		_trigger_game_over()

func _on_chest_opened():
	_show_upgrade_choices()

func _trigger_game_over():
	game_over = true
	GameData.total_games_played += 1
	if score > GameData.high_score:
		GameData.high_score = score
	GameData.save_data()

	game_over_panel.visible = true
	var go_score = game_over_panel.get_node("ScoreValue")
	if go_score:
		go_score.text = str(score)
	var go_wave = game_over_panel.get_node("WaveValue")
	if go_wave:
		go_wave.text = "웨이브 " + str(wave)
	var go_kills = game_over_panel.get_node("KillsValue")
	if go_kills:
		go_kills.text = str(kill_count) + " 처치"

func _show_damage_number(pos: Vector2, text: String, color: Color):
	var label = DamageLabel.instantiate()
	label.position = pos
	label.text = text
	label.modulate = color
	effect_container.add_child(label)

func _show_upgrade_choices():
	paused = true
	get_tree().paused = true
	upgrade_panel.visible = true
	upgrade_panel.generate_choices()

func apply_upgrade(upgrade_id: String):
	match upgrade_id:
		"damage_up":
			damage_mult += 0.3
		"fire_rate_up":
			fire_rate_mult *= 0.85
		"bullet_speed_up":
			bullet_speed_mult += 0.2
		"bullet_count":
			bullet_count_bonus += 1
		"pierce":
			pierce_count += 1
		"crit_up":
			crit_bonus += 0.1
		"homing":
			has_homing = true
		"chain_lightning":
			has_chain_lightning = true
		"freeze":
			has_freeze = true
		"poison":
			has_poison = true
		"orbit":
			orbit_count += 1
			_update_orbits()
		"shield":
			shield_count += 1
		"heal":
			current_hp = min(current_hp + 2, max_hp)
			hp_bar.value = current_hp
		"max_hp_up":
			max_hp += 1
			current_hp += 1
			hp_bar.max_value = max_hp
			hp_bar.value = current_hp

	paused = false
	get_tree().paused = false
	upgrade_panel.visible = false

func _update_orbits():
	if not orbit_container:
		return
	# 기존 오빗 제거
	for child in orbit_container.get_children():
		child.queue_free()
	# 새 오빗 생성
	for i in range(orbit_count):
		var orbit = _create_orbit_ball()
		var angle = (TAU / max(orbit_count, 1)) * i
		orbit.position = Vector2.from_angle(angle) * 80
		orbit_container.add_child(orbit)

func _create_orbit_ball() -> Node2D:
	var node = Area2D.new()
	node.collision_layer = 2
	node.collision_mask = 4

	var shape = CollisionShape2D.new()
	var circle = CircleShape2D.new()
	circle.radius = 12
	shape.shape = circle
	node.add_child(shape)

	# 비주얼
	var sprite = Sprite2D.new()
	# 코드로 텍스처 생성
	var img = Image.create(24, 24, false, Image.FORMAT_RGBA8)
	img.fill(Color.CYAN)
	var tex = ImageTexture.create_from_image(img)
	sprite.texture = tex
	node.add_child(sprite)

	node.body_entered.connect(func(body):
		if body.has_method("take_damage"):
			body.take_damage(GameData.get_base_damage() * damage_mult * 0.5)
	)

	return node

func update_ui():
	score_label.text = str(score)
	wave_label.text = "WAVE " + str(wave)
	xp_bar.max_value = xp_to_next_level
	xp_bar.value = xp
	level_label.text = "Lv." + str(level)
	coin_label.text = str(GameData.coins)

# 부활 (퀴즈 정답 시)
func revive():
	current_hp = max_hp
	hp_bar.value = current_hp
	game_over = false
	game_over_panel.visible = false
	# 주변 적 제거
	for enemy in enemy_container.get_children():
		enemy.queue_free()

func _on_retry_pressed():
	get_tree().paused = false
	get_tree().reload_current_scene()

func _on_menu_pressed():
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")

func _on_revive_pressed():
	# 퀴즈 출제
	quiz_panel.visible = true
	quiz_panel.start_quiz("revive")

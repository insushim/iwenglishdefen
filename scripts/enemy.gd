extends Node2D
## 뱀형 적 - 체인으로 연결된 세포들이 중앙으로 이동

signal died(pos: Vector2, xp_value: int, coin_value: int)
signal reached_heart

var hp: float = 30.0
var max_hp: float = 30.0
var speed: float = 40.0
var target: Vector2 = Vector2.ZERO
var chain_length: int = 5
var damage_value: int = 30
var is_frozen: bool = false
var freeze_timer: float = 0.0
var is_poisoned: bool = false
var poison_timer: float = 0.0
var poison_damage: float = 0.0

# 체인 위치 기록 (뱀 꼬리)
var path_history: Array[Vector2] = []
var chain_nodes: Array[Node2D] = []
const CHAIN_SPACING: int = 20

# 색상
var base_color: Color = Color.RED
var colors = [Color.RED, Color(1, 0.3, 0.3), Color(0.8, 0.2, 0.2), Color(0.6, 0, 0),
	Color(0.2, 0.8, 0.2), Color(0.2, 0.2, 0.9), Color(0.8, 0.8, 0.1)]

func _ready():
	base_color = colors[randi() % colors.size()]
	_create_chain()
	path_history.clear()
	for i in range(chain_length * CHAIN_SPACING + 10):
		path_history.append(position)

func _create_chain():
	# 머리 (Area2D)
	var head_area = Area2D.new()
	head_area.collision_layer = 4  # 적 레이어
	head_area.collision_mask = 2   # 총알 레이어
	var head_shape = CollisionShape2D.new()
	var head_circle = CircleShape2D.new()
	head_circle.radius = 16
	head_shape.shape = head_circle
	head_area.add_child(head_shape)
	add_child(head_area)

	# 체인 노드 (비주얼 전용)
	for i in range(chain_length):
		var chain = Node2D.new()
		chain.position = Vector2.ZERO
		add_child(chain)
		chain_nodes.append(chain)

func _process(delta):
	if is_frozen:
		freeze_timer -= delta
		if freeze_timer <= 0:
			is_frozen = false
		return

	if is_poisoned:
		poison_timer -= delta
		hp -= poison_damage * delta
		if poison_timer <= 0:
			is_poisoned = false
		if hp <= 0:
			_die()
			return

	# 중앙으로 이동
	var dir = (target - position).normalized()
	position += dir * speed * delta

	# 경로 기록
	path_history.push_front(position)
	if path_history.size() > chain_length * CHAIN_SPACING + 10:
		path_history.resize(chain_length * CHAIN_SPACING + 10)

	# 체인 위치 업데이트
	for i in range(chain_nodes.size()):
		var idx = (i + 1) * CHAIN_SPACING
		if idx < path_history.size():
			chain_nodes[i].global_position = path_history[idx]

	# 하트에 도달 체크
	if position.distance_to(target) < 30:
		reached_heart.emit()
		queue_free()

	queue_redraw()

func _draw():
	# 머리 그리기
	draw_circle(Vector2.ZERO, 18, base_color)
	draw_circle(Vector2.ZERO, 14, base_color.lightened(0.3))
	# HP 텍스트
	var font = ThemeDB.fallback_font
	var hp_text = str(int(hp))
	var text_size = font.get_string_size(hp_text, HORIZONTAL_ALIGNMENT_CENTER, -1, 12)
	draw_string(font, Vector2(-text_size.x/2, 5), hp_text, HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color.WHITE)

	# 체인 그리기
	for i in range(chain_nodes.size()):
		var chain_pos = chain_nodes[i].position - position  # 로컬 좌표
		var idx = (i + 1) * CHAIN_SPACING
		if idx < path_history.size():
			chain_pos = path_history[idx] - position
		var radius = 14.0 - i * 0.5
		radius = max(radius, 6.0)
		var col = base_color.darkened(i * 0.06)
		draw_circle(chain_pos, radius + 2, col)
		draw_circle(chain_pos, radius, col.lightened(0.2))

	# 독 상태
	if is_poisoned:
		draw_circle(Vector2.ZERO, 20, Color(0, 0.8, 0, 0.3))
	# 빙결 상태
	if is_frozen:
		draw_circle(Vector2.ZERO, 20, Color(0.5, 0.8, 1, 0.5))

func take_damage(amount: float):
	hp -= amount
	# 히트 플래시
	modulate = Color.WHITE
	var tw = create_tween()
	tw.tween_property(self, "modulate", Color(1,1,1,1), 0.1)

	if hp <= 0:
		_die()

func apply_freeze(duration: float = 2.0):
	is_frozen = true
	freeze_timer = duration

func apply_poison(dps: float = 5.0, duration: float = 3.0):
	is_poisoned = true
	poison_damage = dps
	poison_timer = duration

func _die():
	var xp_val = max(1, int(max_hp / 10))
	var coin_val = max(1, int(max_hp / 20))
	died.emit(global_position, xp_val, coin_val)
	# 사망 이펙트
	_spawn_death_effect()
	queue_free()

func _spawn_death_effect():
	# 파티클 대신 간단한 이펙트
	var effect = Node2D.new()
	effect.global_position = global_position
	effect.set_script(preload("res://scripts/death_effect.gd"))
	get_tree().current_scene.get_node("EffectContainer").add_child(effect)

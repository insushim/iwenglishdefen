extends Area2D
## 총알

var direction: Vector2 = Vector2.RIGHT
var speed: float = 400.0
var damage: float = 10.0
var pierce: int = 0
var is_homing: bool = false
var has_chain: bool = false
var has_freeze: bool = false
var has_poison: bool = false
var is_crit: bool = false
var hits_remaining: int = 0
var lifetime: float = 3.0

var bullet_color: Color = Color(0.3, 0.8, 1.0)

func _ready():
	hits_remaining = pierce + 1
	collision_layer = 2  # 총알 레이어
	collision_mask = 4   # 적 레이어

	var shape = CollisionShape2D.new()
	var circle = CircleShape2D.new()
	circle.radius = 6
	shape.shape = circle
	add_child(shape)

	area_entered.connect(_on_area_entered)

	if is_crit:
		bullet_color = Color(1, 0.8, 0)  # 금색 크리티컬

func _process(delta):
	lifetime -= delta
	if lifetime <= 0:
		queue_free()
		return

	if is_homing:
		var nearest = _find_nearest_enemy()
		if nearest:
			var desired_dir = (nearest.global_position - global_position).normalized()
			direction = direction.lerp(desired_dir, 5.0 * delta).normalized()

	position += direction * speed * delta
	rotation = direction.angle()

	# 화면 밖 체크
	var vp = get_viewport_rect().size
	if position.x < -50 or position.x > vp.x + 50 or position.y < -50 or position.y > vp.y + 50:
		queue_free()

	queue_redraw()

func _draw():
	# 총알 비주얼
	var size = 8.0 if not is_crit else 12.0
	draw_circle(Vector2.ZERO, size, bullet_color)
	draw_circle(Vector2.ZERO, size * 0.6, Color.WHITE)
	# 궤적
	draw_line(Vector2.ZERO, -direction * 15, bullet_color.darkened(0.3), 3.0)

func _on_area_entered(area: Area2D):
	var enemy = area.get_parent()
	if enemy and enemy.has_method("take_damage"):
		enemy.take_damage(damage)

		# 빙결
		if has_freeze and enemy.has_method("apply_freeze"):
			enemy.apply_freeze(1.5)

		# 독
		if has_poison and enemy.has_method("apply_poison"):
			enemy.apply_poison(damage * 0.2, 3.0)

		# 체인 라이트닝
		if has_chain:
			_chain_to_nearby(enemy.global_position, damage * 0.5)

		hits_remaining -= 1
		if hits_remaining <= 0:
			queue_free()

func _chain_to_nearby(from_pos: Vector2, chain_damage: float):
	var enemies = get_tree().get_nodes_in_group("enemies") if false else []
	# 직접 검색
	var parent_scene = get_tree().current_scene
	if parent_scene and parent_scene.has_node("EnemyContainer"):
		for enemy in parent_scene.get_node("EnemyContainer").get_children():
			if enemy.global_position.distance_to(from_pos) < 120 and enemy.global_position != from_pos:
				if enemy.has_method("take_damage"):
					enemy.take_damage(chain_damage)
				break  # 1개만 체인

func _find_nearest_enemy() -> Node2D:
	var nearest: Node2D = null
	var min_dist: float = 300.0  # 유도 범위
	var parent_scene = get_tree().current_scene
	if parent_scene and parent_scene.has_node("EnemyContainer"):
		for enemy in parent_scene.get_node("EnemyContainer").get_children():
			var dist = global_position.distance_to(enemy.global_position)
			if dist < min_dist:
				min_dist = dist
				nearest = enemy
	return nearest

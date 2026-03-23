extends Area2D
## 보물상자

signal opened

var bob_time: float = 0.0
var base_y: float = 0.0
var collected: bool = false

func _ready():
	base_y = position.y
	collision_layer = 8
	collision_mask = 0

	var shape = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(40, 36)
	shape.shape = rect
	add_child(shape)

	# 터치/클릭 감지용
	input_event.connect(_on_input_event)

func _process(delta):
	bob_time += delta
	position.y = base_y + sin(bob_time * 3.0) * 5.0
	queue_redraw()

func _draw():
	if collected:
		return
	# 상자 몸체
	draw_rect(Rect2(-20, -14, 40, 28), Color(0.6, 0.4, 0.1))
	draw_rect(Rect2(-18, -12, 36, 24), Color(0.8, 0.6, 0.2))
	# 잠금장치
	draw_rect(Rect2(-6, -4, 12, 8), Color(1, 0.85, 0))
	# 빛남 이펙트
	var glow_alpha = (sin(bob_time * 4.0) + 1.0) * 0.15
	draw_circle(Vector2.ZERO, 30, Color(1, 1, 0, glow_alpha))

func _on_input_event(_viewport, event, _shape_idx):
	if event is InputEventMouseButton or event is InputEventScreenTouch:
		if event.pressed and not collected:
			_open()

func _open():
	collected = true
	opened.emit()
	# 열림 이펙트
	var tw = create_tween()
	tw.tween_property(self, "scale", Vector2(1.5, 1.5), 0.2)
	tw.tween_property(self, "modulate:a", 0.0, 0.3)
	tw.tween_callback(queue_free)

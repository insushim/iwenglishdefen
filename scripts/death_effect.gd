extends Node2D
## 적 사망 이펙트

var particles: Array = []
var lifetime: float = 0.5

func _ready():
	for i in range(8):
		var angle = randf() * TAU
		var speed = randf_range(80, 200)
		particles.append({
			"pos": Vector2.ZERO,
			"vel": Vector2.from_angle(angle) * speed,
			"color": Color(1, randf_range(0.2, 0.8), 0.1),
			"size": randf_range(3, 8)
		})

func _process(delta):
	lifetime -= delta
	if lifetime <= 0:
		queue_free()
		return

	for p in particles:
		p["pos"] += p["vel"] * delta
		p["vel"] *= 0.95
		p["size"] *= 0.97

	queue_redraw()

func _draw():
	var alpha = lifetime / 0.5
	for p in particles:
		var col = p["color"]
		col.a = alpha
		draw_circle(p["pos"], p["size"], col)

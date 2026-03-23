extends Node2D
## 중앙 하트 비주얼

var pulse_time: float = 0.0

func _process(delta):
	pulse_time += delta
	var pulse = 1.0 + sin(pulse_time * 3.0) * 0.05
	scale = Vector2(pulse, pulse)
	queue_redraw()

func _draw():
	# 하트 모양 그리기 (원 2개 + 삼각형)
	var size: float = 25.0

	# 빨간 하트
	draw_circle(Vector2(-size * 0.3, -size * 0.15), size * 0.45, Color(0.9, 0.1, 0.15))
	draw_circle(Vector2(size * 0.3, -size * 0.15), size * 0.45, Color(0.9, 0.1, 0.15))

	# 하단 삼각형
	var points = PackedVector2Array([
		Vector2(-size * 0.65, -size * 0.05),
		Vector2(size * 0.65, -size * 0.05),
		Vector2(0, size * 0.65)
	])
	draw_colored_polygon(points, Color(0.9, 0.1, 0.15))

	# 하이라이트
	draw_circle(Vector2(-size * 0.2, -size * 0.25), size * 0.15, Color(1, 0.5, 0.5, 0.6))

	# 보호 원
	var ring_alpha = (sin(pulse_time * 2.0) + 1.0) * 0.1 + 0.1
	draw_arc(Vector2.ZERO, 35.0, 0, TAU, 64, Color(1, 0.3, 0.3, ring_alpha), 2.0)

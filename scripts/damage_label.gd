extends Node2D
## 데미지 숫자 표시

var text: String = "0"
var lifetime: float = 0.8
var velocity: Vector2 = Vector2(randf_range(-30, 30), -80)

func _process(delta):
	lifetime -= delta
	position += velocity * delta
	velocity.y += 100 * delta  # 중력
	modulate.a = lifetime / 0.8
	if lifetime <= 0:
		queue_free()
	queue_redraw()

func _draw():
	var font = ThemeDB.fallback_font
	var text_size = font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, 16)
	draw_string(font, Vector2(-text_size.x/2, 0), text, HORIZONTAL_ALIGNMENT_CENTER, -1, 16, Color.WHITE)

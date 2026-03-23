extends Control
## 메인 메뉴

@onready var title_label: Label = $VBox/TitleLabel
@onready var subtitle: Label = $VBox/Subtitle
@onready var play_btn: Button = $VBox/PlayBtn
@onready var shop_btn: Button = $VBox/ShopBtn
@onready var stats_label: Label = $VBox/StatsLabel
@onready var coin_label: Label = $CoinLabel

func _ready():
	title_label.text = "셀 디펜더"
	subtitle.text = "Cell Defender - 영단어 학습 슈팅"
	play_btn.pressed.connect(_on_play)
	shop_btn.pressed.connect(_on_shop)
	_update_stats()

func _update_stats():
	stats_label.text = "최고 점수: " + str(GameData.high_score) + \
		"\n총 게임: " + str(GameData.total_games_played) + \
		"\n맞춘 영단어: " + str(GameData.total_words_correct)
	coin_label.text = "🪙 " + str(GameData.coins)

func _on_play():
	get_tree().change_scene_to_file("res://scenes/game.tscn")

func _on_shop():
	get_tree().change_scene_to_file("res://scenes/shop.tscn")

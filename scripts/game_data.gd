extends Node
## 글로벌 게임 데이터 (Autoload)

# 영구 데이터 (세이브)
var coins: int = 0
var gems: int = 0
var high_score: int = 0
var total_words_correct: int = 0
var total_games_played: int = 0

# 기본 무기 강화 레벨 (상점에서 영구 업그레이드)
var base_damage_level: int = 0
var base_fire_rate_level: int = 0
var base_bullet_speed_level: int = 0
var base_bullet_count_level: int = 0
var base_hp_level: int = 0
var base_crit_level: int = 0

# 업그레이드 비용 계산
func get_upgrade_cost(level: int) -> int:
	return 100 + level * 80

# 기본 스탯 계산
func get_base_damage() -> float:
	return 10.0 + base_damage_level * 3.0

func get_base_fire_rate() -> float:
	return 0.5 - base_fire_rate_level * 0.03  # 낮을수록 빠름

func get_base_bullet_speed() -> float:
	return 400.0 + base_bullet_speed_level * 30.0

func get_base_bullet_count() -> int:
	return 1 + base_bullet_count_level

func get_base_max_hp() -> int:
	return 5 + base_hp_level

func get_base_crit_chance() -> float:
	return 0.05 + base_crit_level * 0.03

# 단어 데이터
var vocab_data: Array = []

func _ready():
	load_data()
	load_vocab()

func load_vocab():
	var file = FileAccess.open("res://data/vocab.json", FileAccess.READ)
	if file:
		var json = JSON.new()
		var result = json.parse(file.get_as_text())
		if result == OK:
			vocab_data = json.data["words"]
		file.close()

func get_quiz_question() -> Dictionary:
	if vocab_data.is_empty():
		return {}

	var correct_word = vocab_data[randi() % vocab_data.size()]
	var is_en_to_ko = randi() % 2 == 0

	# 4지선다 만들기
	var choices: Array = []
	var correct_answer: String
	var question_text: String

	if is_en_to_ko:
		question_text = correct_word["en"]
		correct_answer = correct_word["ko"]
	else:
		question_text = correct_word["ko"]
		correct_answer = correct_word["en"]

	choices.append(correct_answer)

	# 오답 3개 추가
	var used_indices = []
	var correct_idx = vocab_data.find(correct_word)
	used_indices.append(correct_idx)

	while choices.size() < 4:
		var rand_idx = randi() % vocab_data.size()
		if rand_idx in used_indices:
			continue
		used_indices.append(rand_idx)
		var wrong_word = vocab_data[rand_idx]
		if is_en_to_ko:
			choices.append(wrong_word["ko"])
		else:
			choices.append(wrong_word["en"])

	# 섞기
	choices.shuffle()

	return {
		"question": question_text,
		"choices": choices,
		"correct": correct_answer,
		"is_en_to_ko": is_en_to_ko
	}

# 세이브/로드
const SAVE_PATH = "user://save_data.json"

func save_data():
	var data = {
		"coins": coins,
		"gems": gems,
		"high_score": high_score,
		"total_words_correct": total_words_correct,
		"total_games_played": total_games_played,
		"base_damage_level": base_damage_level,
		"base_fire_rate_level": base_fire_rate_level,
		"base_bullet_speed_level": base_bullet_speed_level,
		"base_bullet_count_level": base_bullet_count_level,
		"base_hp_level": base_hp_level,
		"base_crit_level": base_crit_level,
	}
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data))
		file.close()

func load_data():
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file:
		var json = JSON.new()
		var result = json.parse(file.get_as_text())
		if result == OK:
			var data = json.data
			coins = data.get("coins", 0)
			gems = data.get("gems", 0)
			high_score = data.get("high_score", 0)
			total_words_correct = data.get("total_words_correct", 0)
			total_games_played = data.get("total_games_played", 0)
			base_damage_level = data.get("base_damage_level", 0)
			base_fire_rate_level = data.get("base_fire_rate_level", 0)
			base_bullet_speed_level = data.get("base_bullet_speed_level", 0)
			base_bullet_count_level = data.get("base_bullet_count_level", 0)
			base_hp_level = data.get("base_hp_level", 0)
			base_crit_level = data.get("base_crit_level", 0)
		file.close()

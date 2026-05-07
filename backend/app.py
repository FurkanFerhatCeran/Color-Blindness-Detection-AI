"""
Flask Backend - Renk Körlüğü Tespit API
Kullanıcının test cevaplarını alır ve renk körlüğü tipini tahmin eder
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import os
import json
import random
import re
import requests

# Gemini AI kullanımı için artık paket import'una gerek yok
# REST API ile doğrudan çağrı yapılacak

# TensorFlow opsiyonel - yoksa model kullanılmaz
try:
    from tensorflow import keras
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("[UYARI] TensorFlow yuklu degil. Model kullanilamayacak, kural tabanli yontem kullanilacak.")

app = Flask(__name__)
CORS(app)  # Frontend-Backend iletişimi için

# Logging setup
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend_debug.log'),
        logging.StreamHandler()
    ]
)
app.logger.setLevel(logging.DEBUG)

# Model yolu
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'renk_korluğu_model.h5')

# Model yükleme (eğer varsa ve TensorFlow yüklüyse)
model = None
if TENSORFLOW_AVAILABLE and os.path.exists(MODEL_PATH):
    try:
        model = keras.models.load_model(MODEL_PATH)
        print("[OK] Model basariyla yuklendi!")
    except Exception as e:
        print(f"[UYARI] Model yuklenemedi: {e}")
elif not TENSORFLOW_AVAILABLE:
    print("[UYARI] TensorFlow yuklu degil. Model kullanilamayacak, kural tabanli yontem kullanilacak.")
elif not os.path.exists(MODEL_PATH):
    print("[UYARI] Model dosyasi bulunamadi. Kural tabanli yontem kullanilacak.")

# Label mapping yolu (model eğitiminde oluşturulur)
LABEL_MAPPING_PATH = os.path.join(os.path.dirname(__file__), 'label_mapping.json')
label_mapping = None
if os.path.exists(LABEL_MAPPING_PATH):
    try:
        with open(LABEL_MAPPING_PATH, 'r', encoding='utf-8') as f:
            label_mapping = json.load(f)
            # String key'leri int'e cevir
            label_mapping = {int(k): v for k, v in label_mapping.items()}
        print("[OK] Label mapping yuklendi!")
    except Exception as e:
        print(f"[UYARI] Label mapping yuklenemedi: {e}")
else:
    # Varsayilan label mapping (eger dosya yoksa)
    label_mapping = {0: "normal", 1: "protanopi", 2: "deuteranopi", 3: "tritanopi"}
    print("[UYARI] Label mapping dosyasi bulunamadi, varsayilan mapping kullaniliyor.")


# Projede yer alan görseller (3 tip - .png formatında)
IMAGE_FILES = [
    "0_Asap-MediumItalictheme_1 type_1.png",
    "0_AveriaSerifLibre-Regulartheme_3 type_3.png",
    "1_ExpletusSans-Italictheme_3 type_3.png",
    "1_Fahkwang-SemiBoldItalictheme_2 type_2.png",
    "2_Mate-Regulartheme_2 type_2.png",
    "3_Domine-Boldtheme_1 type_1.png",
    "4_DejaVuSanstheme_4 type_2.png",
    "5_Fahkwang-SemiBoldItalictheme_2 type_2.png",
    "5_Phetsarath_OTtheme_3 type_3.png",
    "6_Ramaraja-Regulartheme_3 type_3.png",
    "7_CormorantGaramond-Lighttheme_2 type_2.png",
    "7_VeraMoBItheme_3 type_3.png",
    "8_Asap-MediumItalictheme_1 type_1.png",
    "8_BalooThambi-Regulartheme_2 type_2.png",
    "9_VeraMoBItheme_1 type_1.png"
]

TYPE_MAPPING = {
    "1": "protanopi",
    "2": "deuteranopi",
    "3": "tritanopi"
}


def build_test_data(image_files):
    """Dosya adlarından doğru cevap ve test tipini üretir."""
    data = {}
    for filename in image_files:
        # Doğru cevap: dosya adının başındaki sayı
        answer_match = re.match(r'(\d+)_', filename)
        correct_answer = answer_match.group(1) if answer_match else "0"

        # Test tipi: dosya adının sonundaki type_X bilgisi
        type_match = re.search(r'type_(\d+)', filename)
        type_key = type_match.group(1) if type_match else "1"
        test_type = TYPE_MAPPING.get(type_key, "protanopi")

        data[filename] = {
            "correct_answer": correct_answer,
            "test_type": test_type
        }
    return data


# Test verisi havuzu (3 tip)
ALL_TEST_DATA = build_test_data(IMAGE_FILES)

# Fallback için aynı havuz kullanılır
TEST_DATA = ALL_TEST_DATA.copy()


def generate_random_test():
    """
    Rastgele test görselleri seçer (3 tip, toplam 10 soru)
    """
    categories = {}
    for image_name, meta in ALL_TEST_DATA.items():
        categories.setdefault(meta["test_type"], []).append(image_name)

    desired_distribution = {
        "protanopi": 3,
        "deuteranopi": 3,
        "tritanopi": 4
    }

    selected_images = []
    total_questions = 10

    for category, desired_count in desired_distribution.items():
        available = categories.get(category, [])
        if not available:
            continue

        if len(available) <= desired_count:
            selected_images.extend(available)
        else:
            selected_images.extend(random.sample(available, desired_count))

    # Eğer seçilen görsel sayısı 10'dan fazlaysa kırp
    if len(selected_images) > total_questions:
        selected_images = random.sample(selected_images, total_questions)

    # Eksik kalırsa diğer görsellerle tamamla
    if len(selected_images) < total_questions:
        remaining_pool = [img for img in ALL_TEST_DATA.keys() if img not in selected_images]
        while len(selected_images) < total_questions and remaining_pool:
            choice = random.choice(remaining_pool)
            selected_images.append(choice)
            remaining_pool.remove(choice)

    random.shuffle(selected_images)
    return selected_images[:total_questions]


def prepare_features_for_model_data(answers, test_data):
    """
    Kullanıcı cevaplarını model için feature vektörüne dönüştürür (dinamik test_data ile)
    """
    features = []
    
    # Cevaplanan tüm görseller için feature oluştur
    for answer in answers:
        image_name = answer.get("image")
        user_answer = answer.get("user_answer")
        
        if image_name not in test_data:
            continue
            
        test_info = test_data[image_name]
        correct_answer = test_info.get("correct_answer")
        test_type = test_info.get("test_type", "normal")
        
        # Feature 1: Doğru mu? (1 veya 0)
        is_correct = 1 if str(user_answer) == str(correct_answer) else 0
        
        # Feature 2-5: Test tipi one-hot encoding
        protanopi_test = 1 if test_type == "protanopi" else 0
        deuteranopi_test = 1 if test_type == "deuteranopi" else 0
        tritanopi_test = 1 if test_type == "tritanopi" else 0
        normal_test = 1 if test_type == "normal" else 0
        
        # Feature 6: Cevap verildi mi? (1 veya 0)
        answered = 1 if user_answer is not None else 0
        
        # Feature 7-10: Hata tipi (eğer yanlışsa)
        protanopi_error = 1 if (not is_correct and test_type == "protanopi") else 0
        deuteranopi_error = 1 if (not is_correct and test_type == "deuteranopi") else 0
        tritanopi_error = 1 if (not is_correct and test_type == "tritanopi") else 0
        normal_error = 1 if (not is_correct and test_type == "normal") else 0
        
        # Her test için 10 feature
        test_features = [
            is_correct,
            protanopi_test,
            deuteranopi_test,
            tritanopi_test,
            normal_test,
            answered,
            protanopi_error,
            deuteranopi_error,
            tritanopi_error,
            normal_error
        ]
        features.extend(test_features)
    
    # Eksik feature'ları sıfırla doldur (10 testten az varsa)
    while len(features) < 100:  # 10 test * 10 feature
        features.extend([0] * 10)
    
    # Fazla feature'ları kırp (10 testten fazla varsa) 
    if len(features) > 100:
        features = features[:100]
    
    return np.array(features).reshape(1, -1)


def predict_with_model_data(answers, test_data):
    """
    Model kullanarak tahmin yapar (belirtilen test verisiyle)
    """
    if model is None:
        return None
    
    try:
        # Feature hazırlama
        features = prepare_features_for_model_data(answers, test_data)
        
        # Model input shape kontrolü
        expected_shape = model.input_shape[1] if hasattr(model, 'input_shape') else None
        
        if expected_shape and features.shape[1] != expected_shape:
            print(f"[UYARI] Feature shape uyumsuz: {features.shape[1]} vs {expected_shape}")
            # Shape'i düzelt
            if features.shape[1] < expected_shape:
                padding = np.zeros((1, expected_shape - features.shape[1]))
                features = np.concatenate([features, padding], axis=1)
            else:
                features = features[:, :expected_shape]
        
        # Tahmin yapma
        predictions = model.predict(features, verbose=0)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class] * 100)
        
        # Label mapping ile sınıf adını al
        if label_mapping:
            diagnosis_key = label_mapping.get(predicted_class, "unknown")
        else:
            diagnosis_key = predicted_class
        
        # Türkçe isimlendirme
        diagnosis_map = {
            "normal": "Normal Görme",
            "protanopi": "Protanopi (Kırmızı-Yeşil Körlüğü)",
            "deuteranopi": "Deuteranopi (Yeşil Körlüğü)",
            "tritanopi": "Tritanopi (Mavi-Sarı Körlüğü)",
            0: "Normal Görme",
            1: "Protanopi (Kırmızı-Yeşil Körlüğü)",
            2: "Deuteranopi (Yeşil Körlüğü)",
            3: "Tritanopi (Mavi-Sarı Körlüğü)"
        }
        
        diagnosis = diagnosis_map.get(diagnosis_key, "Belirsiz")
        
        # Açıklama oluştur
        description_map = {
            "normal": "Renk körlüğü belirtisi tespit edilmedi.",
            "protanopi": "Kırmızı renk algılama zorluğu tespit edildi.",
            "deuteranopi": "Yeşil renk algılama zorluğu tespit edildi.",
            "tritanopi": "Mavi-sarı renk algılama zorluğu tespit edildi."
        }
        
        description = description_map.get(diagnosis_key, "ML modeli ile tahmin yapıldı.")
        
        return {
            "diagnosis": diagnosis,
            "confidence": round(confidence, 2),
            "description": description,
            "model_used": True
        }
    except Exception as e:
        print(f"[UYARI] Model tahmini hatasi: {e}")
        import traceback
        traceback.print_exc()
        return None


def evaluate_answers_with_data(answers, test_data):
    """
    Kullanıcının cevaplarını belirtilen test verisiyle değerlendirir
    """
    if not answers:
        return {"error": "Cevap bulunamadı"}
    
    # Önce model ile tahmin yap (eğer model varsa)
    model_prediction = predict_with_model_data(answers, test_data)
    
    # Kural tabanlı değerlendirme
    correct_count = 0
    wrong_count = 0
    protanopi_errors = 0
    deuteranopi_errors = 0
    tritanopi_errors = 0
    
    results = []
    
    for answer in answers:
        image_name = answer.get("image")
        user_answer = answer.get("user_answer")
        
        if image_name not in test_data:
            continue
        
        test_info = test_data[image_name]
        correct_answer = test_info["correct_answer"]
        test_type = test_info["test_type"]
        
        # Cevap kontrolü
        is_correct = str(user_answer) == str(correct_answer) if user_answer else False
        
        if is_correct:
            correct_count += 1
        else:
            wrong_count += 1
            # Hangi tipte hata yapıldığını kaydet
            if test_type == "protanopi":
                protanopi_errors += 1
            elif test_type == "deuteranopi":
                deuteranopi_errors += 1
            elif test_type == "tritanopi":
                tritanopi_errors += 1
        
        results.append({
            "image": image_name,
            "correct": is_correct,
            "correct_answer": correct_answer,
            "user_answer": user_answer,
            "test_type": test_type
        })
    
    # Renk körlüğü tipi tahmini
    total_tests = len(answers)
    accuracy = (correct_count / total_tests * 100) if total_tests > 0 else 0
    
    # Her tür için test sayısını ve hata oranını hesapla
    protanopi_total = sum(1 for a in answers if test_data.get(a.get('image'), {}).get('test_type') == 'protanopi')
    deuteranopi_total = sum(1 for a in answers if test_data.get(a.get('image'), {}).get('test_type') == 'deuteranopi')
    tritanopi_total = sum(1 for a in answers if test_data.get(a.get('image'), {}).get('test_type') == 'tritanopi')
    
    protanopi_rate = (protanopi_errors / protanopi_total * 100) if protanopi_total > 0 else 0
    deuteranopi_rate = (deuteranopi_errors / deuteranopi_total * 100) if deuteranopi_total > 0 else 0
    tritanopi_rate = (tritanopi_errors / tritanopi_total * 100) if tritanopi_total > 0 else 0
    
    # Eşik değer: %50'den fazla hata yapılan türleri tespit et
    THRESHOLD = 50  # %50 ve üzeri
    detected_types = []
    
    if protanopi_rate >= THRESHOLD:
        detected_types.append(("Protanopi (Kırmızı-Yeşil Körlüğü)", protanopi_rate, "Kırmızı renk algılama zorluğu"))
    if deuteranopi_rate >= THRESHOLD:
        detected_types.append(("Deuteranopi (Yeşil Körlüğü)", deuteranopi_rate, "Yeşil renk algılama zorluğu"))
    if tritanopi_rate >= THRESHOLD:
        detected_types.append(("Tritanopi (Mavi-Sarı Körlüğü)", tritanopi_rate, "Mavi-sarı renk algılama zorluğu"))
    
    # Tespit edilen türlere göre sonuç oluştur
    if wrong_count == 0:
        rule_based_diagnosis = "Normal Görme"
        rule_based_confidence = 100.0
        rule_based_description = "Tüm cevaplar doğru. Renk körlüğü belirtisi tespit edilmedi."
    elif len(detected_types) == 0:
        # Hiçbir tür eşik değeri geçmedi
        rule_based_diagnosis = "Belirsiz"
        rule_based_confidence = accuracy
        rule_based_description = "Sonuçlar belirsiz, profesyonel bir göz doktoruna danışın."
    elif len(detected_types) == 1:
        # Tek bir renk körlüğü türü tespit edildi
        rule_based_diagnosis = detected_types[0][0]
        rule_based_confidence = detected_types[0][1]
        rule_based_description = f"{detected_types[0][2]} tespit edildi."
    else:
        # Birden fazla renk körlüğü türü tespit edildi (karma durum)
        detected_types.sort(key=lambda x: x[1], reverse=True)  # En yüksek orandan düşüğe sırala
        types_text = " ve ".join([t[0] for t in detected_types])
        descriptions = ", ".join([t[2] for t in detected_types])
        rule_based_diagnosis = f"Karma Renk Körlüğü: {types_text}"
        rule_based_confidence = sum(t[1] for t in detected_types) / len(detected_types)  # Ortalama oran
        rule_based_description = f"Birden fazla renk algılama zorluğu tespit edildi: {descriptions}. Profesyonel bir göz doktoru muayenesi önerilir."
    
    # Model tahmini varsa onu kullan, yoksa kural tabanlı sonucu kullan
    if model_prediction:
        diagnosis = model_prediction["diagnosis"]
        confidence = model_prediction["confidence"]
        description = model_prediction["description"]
        model_used = True
    else:
        diagnosis = rule_based_diagnosis
        confidence = round(rule_based_confidence, 2)
        description = rule_based_description
        model_used = False
    
    return {
        "diagnosis": diagnosis,
        "confidence": round(confidence, 2),
        "description": description,
        "model_used": model_used,
        "statistics": {
            "total_tests": total_tests,
            "correct": correct_count,
            "wrong": wrong_count,
            "accuracy": round(accuracy, 2)
        },
        "error_breakdown": {
            "protanopi": protanopi_errors,
            "deuteranopi": deuteranopi_errors,
            "tritanopi": tritanopi_errors
        },
        "detailed_results": results
    }



@app.route('/', methods=['GET'])
def home():
    """API ana sayfa"""
    return jsonify({
        "message": "Renk Körlüğü Tespit API",
        "version": "1.0",
        "endpoints": {
            "/predict": "POST - Renk körlüğü tahmini yap",
            "/test-data": "GET - Sabit test verilerini al",
            "/random-test": "GET - Rastgele test görselleri al"
        }
    })


@app.route('/test-data', methods=['GET'])
def get_test_data():
    """Test görsellerinin listesini döndür (doğru cevaplar olmadan)"""
    test_list = []
    for image_name in TEST_DATA.keys():
        test_list.append({"image": image_name})
    
    return jsonify({
        "tests": test_list,
        "total": len(test_list)
    })


@app.route('/random-test', methods=['GET'])
def get_random_test():
    """
    Rastgele test görselleri döndürür
    Her çağrıda farklı görsel kombinasyonu
    """
    try:
        selected_images = generate_random_test()
        
        test_list = []
        for image_name in selected_images:
            test_list.append({"image": image_name})
        
        return jsonify({
            "tests": test_list,
            "total": len(test_list),
            "message": "Rastgele test görselleri oluşturuldu"
        })
    
    except Exception as e:
        return jsonify({
            "error": f"Rastgele test oluşturulurken hata: {str(e)}",
            "tests": [],
            "total": 0
        }), 500


@app.route('/predict', methods=['POST'])
def predict():
    """
    Kullanıcının test cevaplarını alır ve renk körlüğü tipini tahmin eder
    
    Request Body:
    {
        "answers": [
            {"image": "test1.jpg", "user_answer": "12"},
            {"image": "test2.jpg", "user_answer": null},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'answers' not in data:
            return jsonify({"error": "Geçersiz istek. 'answers' alanı gerekli."}), 400
        
        answers = data['answers']
        
        # Kullanılan test verilerini belirle (ALL_TEST_DATA ve TEST_DATA'dan)
        combined_test_data = {**TEST_DATA, **ALL_TEST_DATA}
        
        # Cevapları değerlendir
        result = evaluate_answers_with_data(answers, combined_test_data)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({"error": f"Bir hata oluştu: {str(e)}"}), 500


# Gemini API Configuration
GEMINI_API_KEY = "AIzaSyDbuCtZusMErFuUVWneHAOKq-aBsDm2Oe8"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"  # Güncel model

# Renk körlüğü tipleri için varsayılan öneriler (API çalışmazsa kullanılır)
DEFAULT_RECOMMENDATIONS = {
    "tritanopi": {
        "title": "Tritanopi (Mavi–Sarı Algı Zorluğu)",
        "icon": "🔵",
        "recommendations": [
            "Mavi–sarı renk kombinasyonları içeren uyarı ve işaretlere dikkat edin.",
            "Grafik ve diyagramlarda renge ek olarak metin veya sembol kullanılan tasarımları tercih edin.",
            "Dijital ekranlarda yüksek kontrastlı tema veya koyu mod kullanın.",
            "Kıyafet seçiminde mavi ve sarı tonlarının birlikte kullanıldığı kombinasyonlarda zorlanabilirsiniz.",
            "Trafik işaretlerinde renk yerine şekil ve konum bilgisine odaklanın."
        ]
    },
    "deuteranopi": {
        "title": "Deuteranopi (Yeşil Körlüğü)",
        "icon": "🟢",
        "recommendations": [
            "Kırmızı–yeşil renk ayrımı gerektiren durumlarda ekstra dikkatli olun.",
            "Grafiklerde yalnızca renge dayalı ayrımlar yerine etiketli gösterimler tercih edin.",
            "Teknik, elektrik veya laboratuvar ortamlarında renk kodlarına ek işaretleme kullanın.",
            "Ekranlarda erişilebilirlik ve renk filtreleri ayarlarını aktif hale getirin.",
            "Yemek pişirirken et gibi ürünlerin pişme durumunu renge değil, dokuya ve sıcaklığa göre değerlendirin."
        ]
    },
    "protanopi": {
        "title": "Protanopi (Kırmızı-Yeşil Körlüğü)",
        "icon": "🔴",
        "recommendations": [
            "Kırmızı renk ile verilen uyarı ve hata mesajlarını dikkatle inceleyin.",
            "Trafik ışıklarında renk yerine ışığın konumunu ve parlaklığını esas alın.",
            "Finansal grafiklerde kırmızı–yeşil göstergelerde etiket kullanın.",
            "Koyu kırmızı ve kahverengi tonlarının karışabileceğini göz önünde bulundurun.",
            "Kıyafet seçiminde güvendiğiniz birinden yardım almayı düşünün."
        ]
    },
    "normal": {
        "title": "Normal Renk Görüşü",
        "icon": "✅",
        "recommendations": [
            "Test sonuçlarınız normal renk görüşüne işaret etmektedir.",
            "Düzenli göz muayenesi yaptırmaya devam edin.",
            "Ekran karşısında uzun süre çalışıyorsanız, göz yorgunluğunu azaltmak için mola verin.",
            "Renk körlüğü olan kişilere karşı anlayışlı olun ve gerektiğinde yardımcı olun."
        ]
    }
}


def get_ai_recommendations(primary_type, secondary_type=None, confidence=0):
    """
    Gemini API kullanarak kişiselleştirilmiş öneriler oluşturur (REST API ile)
    NOT: Bu fonksiyon direkt REST API kullanır, google.generativeai paketine gerek yoktur
    """
    app.logger.info(f"\n[FUNCTION] get_ai_recommendations() cagirildi")
    app.logger.info(f"[PARAMS] Primary: {primary_type}")
    app.logger.info(f"[PARAMS] Secondary: {secondary_type}")
    app.logger.info(f"[PARAMS] Confidence: {confidence}")
    
    try:
        # REST API ile Gemini'ye istek at (daha güvenilir)
        headers = {
            "Content-Type": "application/json"
        }
        
        app.logger.info(f"[CONFIG] Gemini API URL: {GEMINI_API_URL}")
        app.logger.info(f"[CONFIG] API Key mevcut: {'Evet' if GEMINI_API_KEY else 'Hayir'}")
        
        # Prompt oluştur
        prompt = f"""Sen bir "renk körlüğü testi" sonuç yorumlayıcısısın. 
        
Girdi Verileri:
- Birincil Teşhis: {primary_type}
- İkincil Teşhis: {secondary_type if secondary_type else "Yok"}
- Güven Skoru: %{confidence}

Görev:
Bu verilere dayanarak aşağıdaki JSON şemasına birebir uyan bir çıktı üret.

İstenen JSON Şeması:
{{
    "primary_recommendations": ["Öneri 1", "Öneri 2", "Öneri 3", "Öneri 4"],
    "secondary_note": "İkincil bulgu varsa buraya kısa bir not, yoksa boş string.",
    "lifestyle_tips": ["Genel yaşam ipucu 1", "Genel yaşam ipucu 2"],
    "disclaimer": "Bu sonuçlar ön değerlendirme amaçlıdır; kesin teşhis için göz doktoruna başvurun."
}}

Öneriler Türkçe, samimi ve motive edici olsun. SADECE JSON döndür, başka bir şey ekleme."""
        
        # API isteği
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.95,
                "topK": 40,
                "maxOutputTokens": 2048
                # Not: responseMimeType v1 API'sinde desteklenmiyor, JSON formatını prompt ile zorluyoruz
            }
        }
        
        api_url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        app.logger.info(f"[REQUEST] Gemini API'ye istek gonderiliyor...")
        
        response = requests.post(api_url, headers=headers, json=payload, timeout=10)
        
        app.logger.info(f"[RESPONSE] Status Code: {response.status_code}")
        
        if response.status_code != 200:
            app.logger.error(f"[HATA] Gemini API hatasi: {response.status_code}")
            app.logger.error(f"[HATA] Response Text: {response.text[:500]}")
            return {"success": False, "ai_generated": False}
        
        result = response.json()
        app.logger.info(f"[PARSE] Response alindi, parse ediliyor...")
        
        # Yanıtı parse et
        if "candidates" in result and len(result["candidates"]) > 0:
            content = result["candidates"][0]["content"]["parts"][0]["text"]
            app.logger.info(f"[PARSE] Raw Content: {content[:200]}...")
            
            # Markdown code block'larını temizle (```json ... ```)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            ai_response = json.loads(content)
            
            app.logger.info(f"[OK] Gemini AI basariyla yanit verdi!")
            
            return {
                "success": True,
                "ai_generated": True,
                "data": ai_response
            }
        else:
            app.logger.error("[HATA] Gemini API'den beklenmeyen yanit formati")
            return {"success": False, "ai_generated": False}

    except requests.exceptions.Timeout:
        app.logger.error("[HATA] Gemini API zaman asimi (timeout)")
        return {"success": False, "ai_generated": False}
    except requests.exceptions.RequestException as e:
        app.logger.error(f"[HATA] Gemini API baglanti hatasi: {str(e)}")
        return {"success": False, "ai_generated": False}
    except json.JSONDecodeError as e:
        app.logger.error(f"[HATA] Gemini API yaniti JSON parse edilemedi: {str(e)}")
        return {"success": False, "ai_generated": False}
    except Exception as e:
        app.logger.error(f"[HATA] Gemini API Genel Hatasi: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return {"success": False, "ai_generated": False}


@app.route('/ai-recommendations', methods=['POST'])
def get_recommendations():
    """
    Test sonuçlarına göre AI destekli öneriler döndürür
    """
    app.logger.info("="*60)
    app.logger.info("[AI-RECOMMENDATIONS] Endpoint cagrisi alindi")
    app.logger.info("="*60)
    
    try:
        data = request.get_json()
        app.logger.info(f"[REQUEST] Gelen veri: {data}")
        
        primary_type = data.get('primary_type', '').lower()
        secondary_type = data.get('secondary_type', '').lower() if data.get('secondary_type') else None
        confidence = data.get('confidence', 0)
        
        app.logger.info(f"[DATA] Primary Type: {primary_type}")
        app.logger.info(f"[DATA] Secondary Type: {secondary_type}")
        app.logger.info(f"[DATA] Confidence: {confidence}")
        
        # AI'dan öneriler al
        app.logger.info("[GEMINI] API cagrisi baslatiliyor...")
        ai_result = get_ai_recommendations(primary_type, secondary_type, confidence)
        app.logger.info(f"[RESULT] Success: {ai_result.get('success')}, AI Generated: {ai_result.get('ai_generated')}")
        
        # Birincil tip için varsayılan öneriler
        primary_key = primary_type.split('(')[0].strip().lower()
        if 'tritanopi' in primary_key or 'mavi' in primary_key:
            primary_key = 'tritanopi'
        elif 'deuteranopi' in primary_key or 'yeşil' in primary_key:
            primary_key = 'deuteranopi'
        elif 'protanopi' in primary_key or 'kırmızı' in primary_key:
            primary_key = 'protanopi'
        elif 'normal' in primary_key:
            primary_key = 'normal'
        else:
            primary_key = 'normal'
        
        primary_default = DEFAULT_RECOMMENDATIONS.get(primary_key, DEFAULT_RECOMMENDATIONS['normal'])
        
        # İkincil tip için varsayılan öneriler
        secondary_default = None
        if secondary_type:
            secondary_key = secondary_type.split('(')[0].strip().lower()
            if 'tritanopi' in secondary_key or 'mavi' in secondary_key:
                secondary_key = 'tritanopi'
            elif 'deuteranopi' in secondary_key or 'yeşil' in secondary_key:
                secondary_key = 'deuteranopi'
            elif 'protanopi' in secondary_key or 'kırmızı' in secondary_key:
                secondary_key = 'protanopi'
            secondary_default = DEFAULT_RECOMMENDATIONS.get(secondary_key)
        
        response_data = {
            "primary": {
                "type": primary_type,
                "title": primary_default['title'],
                "icon": primary_default['icon'],
                "recommendations": ai_result['data']['primary_recommendations'] if ai_result['success'] else primary_default['recommendations']
            },
            "ai_generated": ai_result.get('ai_generated', False)
        }
        
        # İkincil tip varsa ekle
        if secondary_type and secondary_default:
            response_data["secondary"] = {
                "type": secondary_type,
                "title": secondary_default['title'],
                "icon": secondary_default['icon'],
                "note": ai_result['data'].get('secondary_note', f"Ayrıca, ikincil olarak {secondary_default['title']} ile ilişkili bazı algısal zorluklar da gözlemlenmiştir.") if ai_result['success'] else f"Ayrıca, ikincil olarak {secondary_default['title']} ile ilişkili bazı algısal zorluklar da gözlemlenmiştir."
            }
        
        # Genel yaşam önerileri
        if ai_result['success'] and 'lifestyle_tips' in ai_result['data']:
            response_data["lifestyle_tips"] = ai_result['data']['lifestyle_tips']
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"[HATA] Öneri endpoint hatası: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Flask API baslatiliyor...")
    print(f"Model konumu: {MODEL_PATH}")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)


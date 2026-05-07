# 🎨 Renk Körlüğü Tespit Uygulaması

Kullanıcılara Ishihara test plakalarını göstererek renk körlüğü tipini (Protanopi, Deuteranopi, Tritanopi, Normal) tespit eden web tabanlı bir uygulama.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknolojiler](#-teknolojiler)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [Proje Yapısı](#-proje-yapısı)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Test Görselleri](#-test-görselleri)
- [Geliştirme](#-geliştirme)

## ✨ Özellikler

- ✅ **Interaktif Test Arayüzü** - Kullanıcı dostu, modern tasarım
- ✅ **10 Farklı Test Görseli** - Ishihara test plakalarıyla kapsamlı değerlendirme
- ✅ **Gerçek Zamanlı Cevap Kontrolü** - Anlık geri bildirim
- ✅ **Detaylı Sonuç Analizi** - İstatistikler ve güven skoru
- ✅ **4 Renk Körlüğü Tipi Tespiti**:
  - Protanopi (Kırmızı-Yeşil Körlüğü)
  - Deuteranopi (Yeşil Körlüğü)
  - Tritanopi (Mavi-Sarı Körlüğü)
  - Normal Görme
- ✅ **Responsive Tasarım** - Mobil, tablet ve desktop uyumlu
- ✅ **Sonuç İndirme** - JSON formatında test sonuçları
- ✅ **İlerleme Takibi** - Görsel progress bar
- ✅ **Tıbbi Uyarılar** - Profesyonel yönlendirme

## 🛠️ Teknolojiler

### Backend
- **Python 3.8+**
- **Flask 2.3.0** - Web framework
- **TensorFlow/Keras 2.13** - Derin öğrenme modeli
- **Flask-CORS** - Cross-origin desteği
- **Pillow** - Görsel işleme
- **NumPy** - Matematiksel işlemler

### Frontend
- **HTML5** - Yapı
- **CSS3** - Modern tasarım (Gradients, Animations, Grid/Flexbox)
- **JavaScript (ES6+)** - Uygulama mantığı
- **Fetch API** - Backend iletişimi

## 📦 Kurulum

### 1. Gereksinimler
```bash
# Python 3.8 veya üzeri
python --version

# pip güncellemesi
python -m pip install --upgrade pip
```

### 2. Projeyi İndirin
```bash
git clone <repository-url>
cd renk-korlugu-tespiti
```

### 3. Python Paketlerini Yükleyin
```bash
# Virtual environment oluştur (opsiyonel ama önerilen)
python -m venv venv

# Virtual environment'ı aktifleştir
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Gereksinimleri yükle
pip install -r requirements.txt
```

### 4. Test Görsellerini Ekleyin

**Frontend görselleri** (`frontend/images/` klasörüne):
```
frontend/images/
  ├── test1.jpg
  ├── test2.jpg
  ├── test3.jpg
  ├── test4.jpg
  ├── test5.jpg
  ├── test6.jpg
  ├── test7.jpg
  ├── test8.jpg
  ├── test9.jpg
  └── test10.jpg
```

**⚠️ ÖNEMLİ:** 
- Görselleri ekledikten sonra `backend/app.py` dosyasındaki `TEST_DATA` dictionary'sini gerçek test cevaplarıyla güncelleyin.
- Örnek Ishihara test plakalarını [bu linkten](https://en.wikipedia.org/wiki/Ishihara_test) indirebilirsiniz.

### 5. Model Dosyasını Ekleyin (Opsiyonel)

Eğer eğitilmiş bir `.h5` modeliniz varsa:
```bash
# Backend klasörüne kopyalayın
cp renk_korlugu_model.h5 backend/
```

Model yoksa uygulama yine de çalışır (sadece cevap karşılaştırması yapar).

## 🚀 Kullanım

### 1. Backend Sunucusunu Başlatın

```bash
# backend klasörüne gidin
cd backend

# Flask sunucusunu başlatın
python app.py
```

Backend `http://localhost:5000` adresinde çalışacaktır.

### 2. Frontend'i Açın

**Yöntem 1 - Doğrudan HTML:**
```bash
# frontend klasöründen
cd frontend

# Tarayıcıda index.html dosyasını açın
start index.html  # Windows
open index.html   # Mac
xdg-open index.html  # Linux
```

**Yöntem 2 - Live Server (Önerilen):**
```bash
# VS Code Live Server extension kullanın
# veya
python -m http.server 8080
```

Frontend `http://localhost:8080` adresinde açılacaktır.

### 3. Testi Başlatın

1. **Hoş Geldiniz Ekranı** → "Teste Başla" butonuna tıklayın
2. **Test Ekranı** → Her görselde gördüğünüz numarayı girin veya "Göremiyorum" seçin
3. **10 Soru** → Tüm soruları cevaplayın
4. **Sonuç Ekranı** → Renk körlüğü teşhisinizi görün

## 📁 Proje Yapısı

```
renk-korlugu-tespiti/
│
├── backend/
│   ├── app.py                    # Flask API
│   ├── renk_korlugu_model.h5     # Derin öğrenme modeli (opsiyonel)
│   └── test_images/              # Backend test görselleri
│
├── frontend/
│   ├── index.html                # Ana sayfa
│   ├── app.js                    # JavaScript mantığı
│   ├── styles.css                # CSS stilleri
│   └── images/                   # Ishihara test görselleri
│       ├── test1.jpg
│       ├── test2.jpg
│       └── ...
│
├── requirements.txt              # Python gereksinimleri
└── README.md                     # Bu dosya
```

## 🔌 API Dokümantasyonu

### Endpoint'ler

#### 1. GET `/`
API bilgilerini döndürür.

**Response:**
```json
{
  "message": "Renk Körlüğü Tespit API",
  "version": "1.0",
  "endpoints": {
    "/predict": "POST - Renk körlüğü tahmini yap",
    "/test-data": "GET - Test verilerini al"
  }
}
```

#### 2. GET `/test-data`
Test görsellerinin listesini döndürür.

**Response:**
```json
{
  "tests": [
    {"image": "test1.jpg"},
    {"image": "test2.jpg"},
    ...
  ],
  "total": 10
}
```

#### 3. POST `/predict`
Kullanıcı cevaplarını alır ve renk körlüğü tipini tahmin eder.

**Request Body:**
```json
{
  "answers": [
    {"image": "test1.jpg", "user_answer": "12"},
    {"image": "test2.jpg", "user_answer": null},
    {"image": "test3.jpg", "user_answer": "6"}
  ]
}
```

**Response:**
```json
{
  "diagnosis": "Protanopi (Kırmızı-Yeşil Körlüğü)",
  "confidence": 75.5,
  "description": "Kırmızı renk algılama zorluğu tespit edildi.",
  "statistics": {
    "total_tests": 10,
    "correct": 6,
    "wrong": 4,
    "accuracy": 60.0
  },
  "error_breakdown": {
    "protanopi": 3,
    "deuteranopi": 1,
    "tritanopi": 0,
    "normal": 0
  },
  "detailed_results": [
    {
      "image": "test1.jpg",
      "correct": true,
      "correct_answer": "12",
      "user_answer": "12",
      "test_type": "normal"
    },
    ...
  ]
}
```

## 🖼️ Test Görselleri

### Görsel Gereksinimleri

- **Format:** JPG, PNG
- **Boyut:** 300x300 - 600x600 piksel (önerilen)
- **Tip:** Ishihara test plakası
- **İsimlendirme:** `test1.jpg`, `test2.jpg`, ..., `test10.jpg`

### Örnek Test Dağılımı

| Görsel | Doğru Cevap | Test Tipi |
|--------|-------------|-----------|
| test1.jpg | 12 | Normal |
| test2.jpg | 8 | Protanopi |
| test3.jpg | 6 | Deuteranopi |
| test4.jpg | 29 | Normal |
| test5.jpg | 57 | Tritanopi |
| test6.jpg | 5 | Protanopi |
| test7.jpg | 3 | Deuteranopi |
| test8.jpg | 15 | Normal |
| test9.jpg | 74 | Tritanopi |
| test10.jpg | 2 | Protanopi |

## 🔧 Geliştirme

### Özelleştirme

#### 1. Test Verilerini Güncelleme
`backend/app.py` dosyasında `TEST_DATA` dictionary'sini düzenleyin:

```python
TEST_DATA = {
    "test1.jpg": {"correct_answer": "12", "test_type": "normal"},
    "test2.jpg": {"correct_answer": "8", "test_type": "protanopi"},
    # ...
}
```

#### 2. API URL Değiştirme
`frontend/app.js` dosyasında CONFIG'i güncelleyin:

```javascript
const CONFIG = {
    API_URL: 'http://your-backend-url.com',
    IMAGE_PATH: 'images/',
    // ...
};
```

#### 3. Stil Özelleştirme
`frontend/styles.css` dosyasında CSS variables'ı değiştirin:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    /* ... */
}
```

### Debug Modu

**Backend:**
```python
# app.py içinde
app.run(debug=True, host='0.0.0.0', port=5000)
```

**Frontend:**
```javascript
// Browser console'da loglar
console.log('Test başlatıldı');
```

## ⚠️ Önemli Notlar

1. **Tıbbi Uyarı:** Bu uygulama **sadece bilgilendirme amaçlıdır**. Kesin teşhis için mutlaka bir göz doktoruna başvurunuz.

2. **CORS Hatası:** Backend ve frontend farklı portlarda çalışıyorsa CORS sorunu yaşayabilirsiniz. Backend'de Flask-CORS aktif durumda.

3. **Görsel Kalitesi:** Test sonuçlarının doğruluğu için yüksek kaliteli Ishihara test plakası görselleri kullanın.

4. **Model Dosyası:** `.h5` model dosyası olmadan uygulama sadece cevap karşılaştırması yapar (basit mantık).

## 📝 Lisans

Bu proje eğitim amaçlı bir bitirme projesidir.

## 👨‍💻 Geliştirici

**Cumali** - Bitirme Projesi 2025

---

## 🐛 Sorun Giderme

### Backend başlamıyor
```bash
# Port kullanımda olabilir
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux

# Farklı port kullanın
app.run(debug=True, port=5001)
```

### Frontend API'ye bağlanamıyor
- Backend'in çalıştığından emin olun
- Browser console'da hata kontrolü yapın
- `app.js` içindeki `API_URL` doğru mu kontrol edin

### Görseller görünmüyor
- `frontend/images/` klasöründe görsellerin olduğundan emin olun
- Dosya isimlerinin doğru olduğunu kontrol edin
- Browser console'da 404 hatası var mı bakın

## 📞 İletişim

Sorularınız için: [email@example.com](mailto:email@example.com)

---

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**


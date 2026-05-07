/**
 * Renk Körlüğü Tespit Uygulaması - Frontend JavaScript
 * Test mantığı, kullanıcı etkileşimi ve API iletişimi
 */

// Konfigürasyon
const CONFIG = {
    API_URL: 'http://localhost:5000',
    IMAGE_PATH: 'images/',
    USE_RANDOM_TESTS: true, // Rastgele test görselleri kullan
    TEST_IMAGES: [
        '0_Asap-MediumItalictheme_1 type_1.png',
        '0_AveriaSerifLibre-Regulartheme_3 type_3.png',
        '1_ExpletusSans-Italictheme_3 type_3.png',
        '1_Fahkwang-SemiBoldItalictheme_2 type_2.png',
        '2_Mate-Regulartheme_2 type_2.png',
        '3_Domine-Boldtheme_1 type_1.png',
        '4_DejaVuSanstheme_4 type_2.png',
        '5_Fahkwang-SemiBoldItalictheme_2 type_2.png',
        '5_Phetsarath_OTtheme_3 type_3.png',
        '6_Ramaraja-Regulartheme_3 type_3.png',
        '7_CormorantGaramond-Lighttheme_2 type_2.png',
        '7_VeraMoBItheme_3 type_3.png',
        '8_Asap-MediumItalictheme_1 type_1.png',
        '8_BalooThambi-Regulartheme_2 type_2.png',
        '9_VeraMoBItheme_1 type_1.png'
    ] // Fallback - rastgele teste geçilmezse kullanılır
};

// Global state
let currentQuestionIndex = 0;
let userAnswers = [];
let testResults = null;
let currentTestImages = []; // Dinamik test görselleri

function getCurrentImages() {
    return currentTestImages.length > 0 ? currentTestImages : CONFIG.TEST_IMAGES;
}

function getTotalQuestions() {
    return getCurrentImages().length;
}

// DOM Elementleri
const screens = {
    welcome: document.getElementById('welcome-screen'),
    test: document.getElementById('test-screen'),
    result: document.getElementById('result-screen'),
    loading: document.getElementById('loading-screen')
};

const elements = {
    startBtn: document.getElementById('start-test-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    cantSeeBtn: document.getElementById('cant-see-btn'),
    restartBtn: document.getElementById('restart-btn'),
    downloadBtn: document.getElementById('download-results-btn'),
    toggleDetailsBtn: document.getElementById('toggle-details-btn'),
    
    testImage: document.getElementById('test-image'),
    answerInput: document.getElementById('answer-input'),
    currentQuestion: document.getElementById('current-question'),
    totalQuestions: document.getElementById('total-questions'),
    progressFill: document.getElementById('progress-fill'),
    progressPercentage: document.getElementById('progress-percentage'),
    
    resultDiagnosis: document.getElementById('result-diagnosis'),
    resultDescription: document.getElementById('result-description'),
    resultIcon: document.getElementById('result-icon'),
    confidenceFill: document.getElementById('confidence-fill'),
    confidenceValue: document.getElementById('confidence-value'),
    loadingText: document.getElementById('loading-text'),
    
    statTotal: document.getElementById('stat-total'),
    statCorrect: document.getElementById('stat-correct'),
    statWrong: document.getElementById('stat-wrong'),
    statAccuracy: document.getElementById('stat-accuracy'),
    
    detailsContent: document.getElementById('details-content'),
    answerDetails: document.getElementById('answer-details'),
    
    // AI Recommendations Elements
    aiRecommendationsSection: document.getElementById('ai-recommendations-section'),
    aiBadge: document.getElementById('ai-badge'),
    primaryRecommendationCard: document.getElementById('primary-recommendation-card'),
    primaryIcon: document.getElementById('primary-icon'),
    primaryTitle: document.getElementById('primary-title'),
    primaryRecommendationsList: document.getElementById('primary-recommendations-list'),
    secondaryRecommendationCard: document.getElementById('secondary-recommendation-card'),
    secondaryIcon: document.getElementById('secondary-icon'),
    secondaryTitle: document.getElementById('secondary-title'),
    secondaryNote: document.getElementById('secondary-note'),
    lifestyleTipsCard: document.getElementById('lifestyle-tips-card'),
    lifestyleTipsList: document.getElementById('lifestyle-tips-list')
};

// ==================== Event Listeners ====================

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Teste başla
elements.startBtn.addEventListener('click', () => {
    startTest();
});

// Önceki soru
elements.prevBtn.addEventListener('click', () => {
    goToPreviousQuestion();
});

// Sonraki soru
elements.nextBtn.addEventListener('click', () => {
    const answer = elements.answerInput.value.trim();
    if (answer) {
        showToast(`✓ Cevap kaydedildi: ${answer}`, 'success');
    }
    setTimeout(() => {
        goToNextQuestion();
    }, 200);
});

// Testi bitir
elements.submitBtn.addEventListener('click', () => {
    submitTest();
});

// Göremiyorum butonu - Otomatik atlama
elements.cantSeeBtn.addEventListener('click', () => {
    // Butona tıklandı efekti
    elements.cantSeeBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        elements.cantSeeBtn.style.transform = '';
    }, 150);
    
    // Input'u temizle ve cevabı boş string olarak kaydet ("Göremiyorum" = yanlış cevap)
    elements.answerInput.value = '';
    saveCurrentAnswer('');
    
    // Görsel feedback
    showToast('✓ Cevap kaydedildi: Göremiyorum', 'info');
    
    // Son soru mu kontrol et
    if (currentQuestionIndex === getTotalQuestions() - 1) {
        // Son soruysa, testi bitir butonunu aktif et
        elements.submitBtn.disabled = false;
        console.log('📝 Son soru "Göremiyorum" olarak işaretlendi. Testi bitirebilirsiniz.');
    } else {
        // Son soru değilse, otomatik olarak sonraki soruya geç
        console.log('⏭️ "Göremiyorum" seçildi, sonraki soruya geçiliyor...');
        setTimeout(() => {
            goToNextQuestion();
        }, 400); // 400ms gecikme (kullanıcı deneyimi için)
    }
});

// Cevap input'u değiştiğinde
elements.answerInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value) {
        saveCurrentAnswer(value);
        elements.nextBtn.disabled = false;
        if (currentQuestionIndex === getTotalQuestions() - 1) {
            elements.submitBtn.disabled = false;
        }
    } else {
        // Input boşsa null yap
        saveCurrentAnswer(null);
        elements.nextBtn.disabled = true;
        if (currentQuestionIndex === getTotalQuestions() - 1) {
            elements.submitBtn.disabled = true;
        }
    }
});

// Enter tuşu ile sonraki soru
elements.answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !elements.nextBtn.disabled) {
        const answer = elements.answerInput.value.trim();
        if (answer) {
            showToast(`✓ Cevap kaydedildi: ${answer}`, 'success');
        }
        
        if (currentQuestionIndex === getTotalQuestions() - 1) {
            submitTest();
        } else {
            setTimeout(() => {
                goToNextQuestion();
            }, 300);
        }
    }
});

// Tekrar test et
elements.restartBtn.addEventListener('click', () => {
    restartTest();
});

// Sonuçları indir
elements.downloadBtn.addEventListener('click', () => {
    downloadResults();
});

// Detayları göster/gizle
elements.toggleDetailsBtn.addEventListener('click', () => {
    const isVisible = elements.detailsContent.style.display === 'block';
    elements.detailsContent.style.display = isVisible ? 'none' : 'block';
    elements.toggleDetailsBtn.textContent = isVisible ? '📊 Detaylı Sonuçları Gör' : '📊 Detayları Gizle';
});

// ==================== Ana Fonksiyonlar ====================

function initializeApp() {
    console.log('🎨 Renk Körlüğü Tespit Uygulaması başlatıldı');
    elements.totalQuestions.textContent = getTotalQuestions(); // Varsayılan olarak fallback uzunluğu
    
    // Sayfa ilk yüklendiğinde sadece welcome screen görünsün
    showScreen('welcome');
    
    // Ana Sayfa linki - Welcome ekranına dön
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.textContent === 'Ana Sayfa') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showScreen('welcome');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    });
    
    // Dark Mode Initialization
    initializeTheme();
    
    // Loading screen'i gizle
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Navigation event listener'larını ayarla
    setupNavigation();
}

function setupNavigation() {
    // Ana sayfa navigasyonu - Logo
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            console.log('🏠 Logo tıklandı - Ana sayfaya dönülüyor');
            restartTest();
        });
    }

    // Ana sayfa navigasyonu - Nav link
    const navHome = document.getElementById('nav-home');
    if (navHome) {
        navHome.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🏠 Ana Sayfa linki tıklandı');
            restartTest();
        });
    }

    // Hakkında linki
    const navAbout = document.getElementById('nav-about');
    if (navAbout) {
        navAbout.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Hakkında sayfası yakında eklenecek.');
        });
    }

    // İletişim linki
    const navContact = document.getElementById('nav-contact');
    if (navContact) {
        navContact.addEventListener('click', (e) => {
            e.preventDefault();
            alert('İletişim sayfası yakında eklenecek.');
        });
    }
}

async function startTest() {
    console.log('🚀 Test başlatılıyor...');
    
    // Loading screen göster
    showScreen('loading');
    
    try {
        // Test görsellerini yükle
        await loadTestImages();
        
        // Global state'i sıfırla
        currentQuestionIndex = 0;
        userAnswers = [];
        testResults = null;
        
        // Cevap array'ini hazırla
        userAnswers = new Array(getTotalQuestions()).fill(null);
        
        console.log(`📊 Test hazır: ${currentTestImages.length} soru`);
        console.log('🖼️ Kullanılacak görseller:', currentTestImages);
        
        // Test ekranına geçiş
        showScreen('test');
        
        // İlk soruyu göster
        loadQuestion(0);
        
    } catch (error) {
        console.error('❌ Test başlatılırken hata:', error);
        console.error('Hata detayları:', error.stack);
        alert('Test başlatılırken bir hata oluştu. Console\'da detayları kontrol edin.\n\nHata: ' + error.message);
        showScreen('welcome');
    }
}

function loadQuestion(index) {
    currentQuestionIndex = index;
    
    // İlerleme güncelle
    const totalImages = getTotalQuestions();
    const progress = ((index + 1) / totalImages) * 100;
    elements.currentQuestion.textContent = index + 1;
    elements.totalQuestions.textContent = totalImages;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressPercentage.textContent = `${Math.round(progress)}%`;
    
    // Loader'ı göster
    const imageLoader = document.getElementById('image-loader');
    if (imageLoader) {
        imageLoader.style.display = 'flex';
    }
    
    // Görsel yükle
    const images = getCurrentImages();
    const imageName = images[index];
    const imageUrl = `${CONFIG.IMAGE_PATH}${imageName}`;
    
    // Önce görseli gizle
    elements.testImage.classList.remove('loaded');
    
    // Görseli yükle ve yüklendiğinde loader'ı gizle
    elements.testImage.onload = function() {
        if (imageLoader) {
            imageLoader.style.display = 'none';
        }
        // Görsel yüklendi, smooth fade-in
        elements.testImage.classList.add('loaded');
        console.log(`✅ Görsel yüklendi: ${imageName}`);
    };
    
    elements.testImage.onerror = function() {
        if (imageLoader) {
            imageLoader.style.display = 'none';
        }
        console.error(`❌ Görsel yüklenemedi: ${imageName}`);
        alert(`Görsel yüklenemedi: ${imageName}\n\nLütfen görsellerin frontend/images/ klasöründe olduğundan emin olun.`);
    };
    
    elements.testImage.src = imageUrl;
    elements.testImage.alt = `Test Görseli ${index + 1}`;
    
    // Önceki cevabı göster (boş string ve null'u ayır)
    const previousAnswer = userAnswers[index];
    elements.answerInput.value = (previousAnswer !== null && previousAnswer !== '') ? previousAnswer : '';
    
    // Buton durumlarını güncelle (null değilse aktif, boş string = "göremiyorum" de geçerli)
    elements.prevBtn.disabled = index === 0;
    elements.nextBtn.disabled = previousAnswer === null;
    
    // Son soru mu?
    if (index === getTotalQuestions() - 1) {
        elements.nextBtn.style.display = 'none';
        elements.submitBtn.style.display = 'inline-block';
        elements.submitBtn.disabled = previousAnswer === null;
    } else {
        elements.nextBtn.style.display = 'inline-block';
        elements.submitBtn.style.display = 'none';
    }
    
    // Input'a odaklan
    elements.answerInput.focus();
}

function saveCurrentAnswer(answer) {
    userAnswers[currentQuestionIndex] = answer;
    console.log(`Cevap kaydedildi [${currentQuestionIndex}]: ${answer}`);
}

function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        loadQuestion(currentQuestionIndex - 1);
    }
}

function goToNextQuestion() {
    if (currentQuestionIndex < getTotalQuestions() - 1) {
        loadQuestion(currentQuestionIndex + 1);
    }
}

async function submitTest() {
    console.log('✅ Test gönderiliyor...');
    
    // Tüm sorular cevaplanmış mı kontrol et
    const unansweredCount = userAnswers.filter(a => a === null).length;
    if (unansweredCount > 0) {
        alert(`Lütfen tüm soruları cevaplayın. ${unansweredCount} soru cevapsız.`);
        return;
    }
    
    // Yükleme ekranını göster
    showScreen('loading');
    
    // API'ye gönderilecek veri formatı
    const imagesForPayload = getCurrentImages();
    const payload = {
        answers: imagesForPayload.map((image, index) => ({
            image,
            // Boş string ise null gönder (backend'de yanlış cevap olarak işlenir)
            user_answer: userAnswers[index] === '' ? null : userAnswers[index]
        }))
    };
    
    try {
        // Backend API'ye POST isteği
        const response = await fetch(`${CONFIG.API_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Hatası: ${response.status}`);
        }
        
        testResults = await response.json();
        console.log('📊 Sonuçlar alındı:', testResults);
        
        // Kısa bir animasyon gecikmesi (300ms)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Sonuçları göster
        displayResults(testResults);
        
    } catch (error) {
        console.error('❌ API Hatası:', error);
        alert('Sonuçlar alınırken bir hata oluştu. Backend sunucusunun çalıştığından emin olun.\n\nHata: ' + error.message);
        showScreen('test');
    }
}

function displayResults(results) {
    console.log('📊 Sonuçlar gösteriliyor...');
    
    // 🎉 CONFETTI EFFECT - Test tamamlandı kutlaması!
    setTimeout(() => {
        createConfetti();
    }, 500);
    
    // Teşhis
    elements.resultDiagnosis.textContent = results.diagnosis || 'Belirsiz';
    elements.resultDescription.textContent = results.description || '';
    
    // İkon değiştir - TADA ANİMASYONU ile!
    const diagnosis = results.diagnosis || '';
    setTimeout(() => {
        tadaAnimation(elements.resultIcon);
    }, 300);
    
    if (diagnosis.includes('Normal')) {
        elements.resultIcon.textContent = '✅';
        elements.resultIcon.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    } else if (diagnosis.includes('Protanopi')) {
        elements.resultIcon.textContent = '🔴';
        elements.resultIcon.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    } else if (diagnosis.includes('Deuteranopi')) {
        elements.resultIcon.textContent = '🟢';
        elements.resultIcon.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    } else if (diagnosis.includes('Tritanopi')) {
        elements.resultIcon.textContent = '🔵';
        elements.resultIcon.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    } else {
        elements.resultIcon.textContent = '❓';
        elements.resultIcon.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    }
    
    // İstatistikler - ANIMATED COUNTERS! 🎬
    const stats = results.statistics || {};
    
    // Sayıları 0'dan başlatıp animate et
    animateCounter(elements.statTotal, 0, stats.total_tests || 0, 1000);
    animateCounter(elements.statCorrect, 0, stats.correct || 0, 1200);
    animateCounter(elements.statWrong, 0, stats.wrong || 0, 1400);
    
    // Accuracy için özel animasyon
    const accuracyValue = stats.accuracy || 0;
    const accuracyElement = elements.statAccuracy;
    let currentAccuracy = 0;
    const accuracyInterval = setInterval(() => {
        currentAccuracy += 2;
        if (currentAccuracy >= accuracyValue) {
            currentAccuracy = accuracyValue;
            clearInterval(accuracyInterval);
        }
        accuracyElement.textContent = `${currentAccuracy}%`;
    }, 20);
    
    // Güven skoru - ANIMATED PROGRESS BAR! 📊
    const confidence = results.confidence || 0;
    
    // Önce 0'dan başlat
    elements.confidenceFill.style.width = '0%';
    elements.confidenceValue.textContent = '0%';
    
    // Sonra animate et
    setTimeout(() => {
        elements.confidenceFill.style.width = `${confidence}%`;
        
        let currentConfidence = 0;
        const confidenceInterval = setInterval(() => {
            currentConfidence += 2;
            if (currentConfidence >= confidence) {
                currentConfidence = confidence;
                clearInterval(confidenceInterval);
            }
            elements.confidenceValue.textContent = `${currentConfidence}%`;
        }, 20);
    }, 800);
    
    // Güven skoruna göre renk
    if (confidence >= 80) {
        elements.confidenceFill.style.background = 'linear-gradient(90deg, #56ab2f 0%, #a8e063 100%)';
    } else if (confidence >= 50) {
        elements.confidenceFill.style.background = 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)';
    } else {
        elements.confidenceFill.style.background = 'linear-gradient(90deg, #eb3349 0%, #f45c43 100%)';
    }
    
    // Detaylı sonuçlar
    displayDetailedResults(results.detailed_results || []);
    
    // AI Önerileri al ve göster
    fetchAndDisplayAIRecommendations(results);
    
    // Sonuç ekranını göster
    showScreen('result');
}

/**
 * AI destekli önerileri API'den alır ve gösterir
 */
async function fetchAndDisplayAIRecommendations(results) {
    console.log('🤖 AI önerileri alınıyor...');
    
    const diagnosis = results.diagnosis || '';
    const confidence = results.confidence || 0;
    
    // Birincil ve ikincil tipleri belirle
    let primaryType = '';
    let secondaryType = null;
    
    // Karma renk körlüğü kontrolü
    if (diagnosis.includes('Karma')) {
        // "Karma Renk Körlüğü: Tritanopi (Mavi-Sarı Körlüğü) ve Deuteranopi (Yeşil Körlüğü)" formatını parse et
        const types = diagnosis.replace('Karma Renk Körlüğü:', '').trim().split(' ve ');
        if (types.length >= 1) primaryType = types[0].trim();
        if (types.length >= 2) secondaryType = types[1].trim();
    } else if (diagnosis.includes('Tritanopi')) {
        primaryType = 'Tritanopi (Mavi-Sarı Körlüğü)';
    } else if (diagnosis.includes('Deuteranopi')) {
        primaryType = 'Deuteranopi (Yeşil Körlüğü)';
    } else if (diagnosis.includes('Protanopi')) {
        primaryType = 'Protanopi (Kırmızı-Yeşil Körlüğü)';
    } else if (diagnosis.includes('Normal')) {
        primaryType = 'Normal Görme';
    } else {
        primaryType = diagnosis;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/ai-recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                primary_type: primaryType,
                secondary_type: secondaryType,
                confidence: confidence
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAIRecommendations(data);
        } else {
            console.warn('AI önerileri alınamadı, varsayılan öneriler gösteriliyor');
            displayDefaultRecommendations(primaryType, secondaryType);
        }
    } catch (error) {
        console.error('AI öneri hatası:', error);
        displayDefaultRecommendations(primaryType, secondaryType);
    }
}

/**
 * AI önerilerini ekrana render eder
 */
function displayAIRecommendations(data) {
    console.log('📝 AI önerileri gösteriliyor:', data);
    
    // Bölümü göster
    if (elements.aiRecommendationsSection) {
        elements.aiRecommendationsSection.style.display = 'block';
    }
    
    // AI badge'i göster
    if (data.ai_generated && elements.aiBadge) {
        elements.aiBadge.style.display = 'inline-flex';
    }
    
    // Birincil önerileri göster
    if (data.primary && elements.primaryRecommendationCard) {
        elements.primaryIcon.textContent = data.primary.icon || '🔵';
        elements.primaryTitle.textContent = data.primary.title || 'Renk Körlüğü Tespiti';
        
        // Öneri listesini oluştur
        elements.primaryRecommendationsList.innerHTML = '';
        const recommendations = data.primary.recommendations || [];
        recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            elements.primaryRecommendationsList.appendChild(li);
        });
        
        elements.primaryRecommendationCard.style.display = 'block';
    }
    
    // İkincil önerileri göster (varsa)
    if (data.secondary && elements.secondaryRecommendationCard) {
        elements.secondaryIcon.textContent = data.secondary.icon || '🟢';
        elements.secondaryTitle.textContent = data.secondary.title || 'İkincil Tespit';
        elements.secondaryNote.textContent = data.secondary.note || '';
        
        elements.secondaryRecommendationCard.style.display = 'block';
    } else if (elements.secondaryRecommendationCard) {
        elements.secondaryRecommendationCard.style.display = 'none';
    }
    
    // Yaşam önerilerini göster (varsa)
    if (data.lifestyle_tips && data.lifestyle_tips.length > 0 && elements.lifestyleTipsCard) {
        elements.lifestyleTipsList.innerHTML = '';
        data.lifestyle_tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            elements.lifestyleTipsList.appendChild(li);
        });
        elements.lifestyleTipsCard.style.display = 'block';
    } else if (elements.lifestyleTipsCard) {
        elements.lifestyleTipsCard.style.display = 'none';
    }
    
    // Animasyon efekti
    setTimeout(() => {
        if (elements.aiRecommendationsSection) {
            elements.aiRecommendationsSection.classList.add('fade-in');
        }
    }, 100);
}

/**
 * API hatası durumunda varsayılan önerileri gösterir
 */
function displayDefaultRecommendations(primaryType, secondaryType) {
    console.log('📝 Varsayılan öneriler gösteriliyor');
    
    const defaultRecommendations = {
        'tritanopi': {
            title: 'Tritanopi (Mavi–Sarı Algı Zorluğu)',
            icon: '🔵',
            recommendations: [
                'Mavi–sarı renk kombinasyonları içeren uyarı ve işaretlere dikkat edin.',
                'Grafik ve diyagramlarda renge ek olarak metin veya sembol kullanılan tasarımları tercih edin.',
                'Dijital ekranlarda yüksek kontrastlı tema veya koyu mod kullanın.',
                'Kıyafet seçiminde mavi ve sarı tonlarının birlikte kullanıldığı kombinasyonlarda zorlanabilirsiniz.',
                'Trafik işaretlerinde renk yerine şekil ve konum bilgisine odaklanın.'
            ]
        },
        'deuteranopi': {
            title: 'Deuteranopi (Yeşil Körlüğü)',
            icon: '🟢',
            recommendations: [
                'Kırmızı–yeşil renk ayrımı gerektiren durumlarda ekstra dikkatli olun.',
                'Grafiklerde yalnızca renge dayalı ayrımlar yerine etiketli gösterimler tercih edin.',
                'Teknik, elektrik veya laboratuvar ortamlarında renk kodlarına ek işaretleme kullanın.',
                'Ekranlarda erişilebilirlik ve renk filtreleri ayarlarını aktif hale getirin.',
                'Yemek pişirirken et gibi ürünlerin pişme durumunu renge değil, dokuya ve sıcaklığa göre değerlendirin.'
            ]
        },
        'protanopi': {
            title: 'Protanopi (Kırmızı-Yeşil Körlüğü)',
            icon: '🔴',
            recommendations: [
                'Kırmızı renk ile verilen uyarı ve hata mesajlarını dikkatle inceleyin.',
                'Trafik ışıklarında renk yerine ışığın konumunu ve parlaklığını esas alın.',
                'Finansal grafiklerde kırmızı–yeşil göstergelerde etiket kullanın.',
                'Koyu kırmızı ve kahverengi tonlarının karışabileceğini göz önünde bulundurun.',
                'Kıyafet seçiminde güvendiğiniz birinden yardım almayı düşünün.'
            ]
        },
        'normal': {
            title: 'Normal Renk Görüşü',
            icon: '✅',
            recommendations: [
                'Test sonuçlarınız normal renk görüşüne işaret etmektedir.',
                'Düzenli göz muayenesi yaptırmaya devam edin.',
                'Ekran karşısında uzun süre çalışıyorsanız, göz yorgunluğunu azaltmak için mola verin.',
                'Renk körlüğü olan kişilere karşı anlayışlı olun ve gerektiğinde yardımcı olun.'
            ]
        }
    };
    
    // Tip belirleme
    let primaryKey = 'normal';
    const lowerPrimary = primaryType.toLowerCase();
    if (lowerPrimary.includes('tritanopi') || lowerPrimary.includes('mavi')) {
        primaryKey = 'tritanopi';
    } else if (lowerPrimary.includes('deuteranopi') || lowerPrimary.includes('yeşil')) {
        primaryKey = 'deuteranopi';
    } else if (lowerPrimary.includes('protanopi') || lowerPrimary.includes('kırmızı')) {
        primaryKey = 'protanopi';
    }
    
    const primaryData = defaultRecommendations[primaryKey] || defaultRecommendations['normal'];
    
    // Varsayılan veri ile render
    const data = {
        ai_generated: false,
        primary: {
            type: primaryType,
            title: primaryData.title,
            icon: primaryData.icon,
            recommendations: primaryData.recommendations
        }
    };
    
    // İkincil tip varsa ekle
    if (secondaryType) {
        let secondaryKey = 'normal';
        const lowerSecondary = secondaryType.toLowerCase();
        if (lowerSecondary.includes('tritanopi') || lowerSecondary.includes('mavi')) {
            secondaryKey = 'tritanopi';
        } else if (lowerSecondary.includes('deuteranopi') || lowerSecondary.includes('yeşil')) {
            secondaryKey = 'deuteranopi';
        } else if (lowerSecondary.includes('protanopi') || lowerSecondary.includes('kırmızı')) {
            secondaryKey = 'protanopi';
        }
        
        const secondaryData = defaultRecommendations[secondaryKey];
        if (secondaryData) {
            data.secondary = {
                type: secondaryType,
                title: secondaryData.title,
                icon: secondaryData.icon,
                note: `Ayrıca, ikincil olarak ${secondaryData.title} ile ilişkili bazı algısal zorluklar da gözlemlenmiştir.`
            };
        }
    }
    
    displayAIRecommendations(data);
}

function displayDetailedResults(detailedResults) {
    elements.answerDetails.innerHTML = '';
    
    // Test tipi açıklamaları
    const testTypeNames = {
        'protanopi': '🔴 Kırmızı-Yeşil Körlüğü Testi',
        'deuteranopi': '🟢 Yeşil Körlüğü Testi',
        'tritanopi': '🔵 Mavi-Sarı Körlüğü Testi'
    };
    
    detailedResults.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = `answer-item ${result.correct ? 'correct' : 'wrong'}`;
        
        // Kullanıcı cevabını formatla
        let userAnswerDisplay = result.user_answer;
        if (!userAnswerDisplay || userAnswerDisplay === 'null' || userAnswerDisplay === null) {
            userAnswerDisplay = 'Göremedim';
        }
        
        const testTypeName = testTypeNames[result.test_type] || result.test_type;
        
        resultItem.innerHTML = `
            <div class="answer-header">
                <div class="question-number">Soru ${index + 1}</div>
                <div class="test-type-badge">${testTypeName}</div>
            </div>
            <div class="answer-content">
                <div class="answer-row">
                    <span class="answer-label">✓ Doğru Cevap:</span>
                    <span class="answer-value correct-value">${result.correct_answer}</span>
                </div>
                <div class="answer-row">
                    <span class="answer-label">➤ Sizin Cevabınız:</span>
                    <span class="answer-value user-value">${userAnswerDisplay}</span>
                </div>
            </div>
            <div class="answer-status">
                ${result.correct ? '<span class="status-icon correct-icon">✓</span>' : '<span class="status-icon wrong-icon">✗</span>'}
            </div>
        `;
        
        elements.answerDetails.appendChild(resultItem);
    });
}

function restartTest() {
    console.log('🔄 Test yeniden başlatılıyor...');
    currentQuestionIndex = 0;
    userAnswers = [];
    testResults = null;
    elements.detailsContent.style.display = 'none';
    elements.toggleDetailsBtn.textContent = '📊 Detaylı Sonuçları Gör';
    showScreen('welcome');
}

function downloadResults() {
    if (!testResults) {
        alert('İndirilecek sonuç bulunamadı.');
        return;
    }
    
    // JSON formatında sonuçları indir
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = `renk-korlugu-test-sonucu-${new Date().getTime()}.json`;
    downloadLink.click();
    
    console.log('📥 Sonuçlar indirildi');
}

// Test görselleri yükleme fonksiyonu
async function loadTestImages() {
    if (CONFIG.USE_RANDOM_TESTS) {
        try {
            console.log('🎲 Rastgele test görselleri yükleniyor...');
            
            const response = await fetch(`${CONFIG.API_URL}/random-test`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Hatası: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Rastgele görseller alındı:', data);
            
            if (data.tests && Array.isArray(data.tests) && data.tests.length > 0) {
                currentTestImages = data.tests.map(test => test.image);
                console.log('📋 Kullanılacak görseller:', currentTestImages);
                return true;
            } else {
                throw new Error('Geçersiz test listesi formatı');
            }
            
        } catch (error) {
            console.error('❌ Rastgele test yüklenirken hata:', error);
            console.log('🔄 Varsayılan test görsellerine geçiliyor...');
            currentTestImages = [...CONFIG.TEST_IMAGES];
            return false;
        }
    } else {
        console.log('📋 Varsayılan test görselleri kullanılıyor');
        currentTestImages = [...CONFIG.TEST_IMAGES];
        return true;
    }
}

function showScreen(screenName) {
    // Tüm ekranları gizle
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Seçili ekranı göster
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        console.log(`📺 Ekran değiştirildi: ${screenName}`);
    }
}

// ==================== Yardımcı Fonksiyonlar ====================

// API bağlantısını test et
async function testAPIConnection() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/`);
        const data = await response.json();
        console.log('✅ API Bağlantısı Başarılı:', data);
        return true;
    } catch (error) {
        console.error('❌ API Bağlantı Hatası:', error);
        return false;
    }
}

// Toast Notification - Kullanıcı Geri Bildirimi
function showToast(message, type = 'info') {
    // Varolan toast'ı kaldır
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Tip'e göre renkler
    const colors = {
        success: {
            bg: 'linear-gradient(135deg, rgba(209, 242, 216, 0.98) 0%, rgba(240, 253, 244, 0.95) 100%)',
            border: '#34C759',
            shadow: 'rgba(52, 199, 89, 0.20)'
        },
        info: {
            bg: 'linear-gradient(135deg, rgba(238, 246, 255, 0.98) 0%, rgba(248, 251, 255, 0.95) 100%)',
            border: '#0A84FF',
            shadow: 'rgba(10, 132, 255, 0.20)'
        },
        error: {
            bg: 'linear-gradient(135deg, rgba(254, 226, 227, 0.98) 0%, rgba(254, 242, 242, 0.95) 100%)',
            border: '#FF3B30',
            shadow: 'rgba(255, 59, 48, 0.20)'
        }
    };
    
    const colorScheme = colors[type] || colors.info;
    
    // Yeni toast oluştur
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    
    // Stil ekle
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        padding: 16px 24px;
        background: ${colorScheme.bg};
        border: 1px solid ${colorScheme.border};
        border-left: 4px solid ${colorScheme.border};
        border-radius: 16px;
        box-shadow: 0 4px 20px ${colorScheme.shadow}, 0 8px 40px ${colorScheme.shadow};
        color: #1C1C1E;
        font-size: 0.9375rem;
        font-weight: 600;
        z-index: 9999;
        animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(12px);
        max-width: 320px;
    `;
    
    // Sayfaya ekle
    document.body.appendChild(toast);
    
    // 2 saniye sonra kaldır
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
}

// Toast animasyonları için CSS ekle
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @media (max-width: 768px) {
        .toast-notification {
            right: 16px !important;
            left: 16px !important;
            max-width: calc(100% - 32px) !important;
        }
    }
`;
document.head.appendChild(style);

// Sayfa yüklendiğinde API'yi test et
window.addEventListener('load', () => {
    testAPIConnection();
});

// ==================== Dark Mode / Theme System ====================

/**
 * Theme Yönetimi - Dark/Light Mode
 */
function initializeTheme() {
    // LocalStorage'dan tema tercihini al
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Sistem tema tercihini kontrol et (eğer daha önce ayarlanmamışsa)
    if (!localStorage.getItem('theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        setTheme(theme);
    } else {
        setTheme(savedTheme);
    }
    
    // Theme toggle butonuna event listener ekle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        console.log('🌓 Theme toggle butonu hazır');
    }
    
    // Sistem tema değişikliklerini dinle
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Kullanıcı manuel ayar yapmamışsa sistem tercihini takip et
        if (!localStorage.getItem('theme-manual')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
    
    console.log(`🎨 Tema yüklendi: ${savedTheme}`);
}

/**
 * Tema değiştir (Dark <-> Light)
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Manuel ayar yapıldığını işaretle
    localStorage.setItem('theme-manual', 'true');
    
    setTheme(newTheme);
    
    // Kullanıcıya geri bildirim
    const themeText = newTheme === 'dark' ? '🌙 Karanlık Mod' : '☀️ Aydınlık Mod';
    showToast(themeText + ' aktif', 'info');
    
    console.log(`🌓 Tema değiştirildi: ${newTheme}`);
}

/**
 * Temayı uygula
 */
function setTheme(theme) {
    // HTML'e data-theme attribute'ü ekle
    document.documentElement.setAttribute('data-theme', theme);
    
    // LocalStorage'a kaydet
    localStorage.setItem('theme', theme);
    
    // Meta theme-color tag'ini güncelle (mobil tarayıcılar için)
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        document.head.appendChild(themeColorMeta);
    }
    
    // Tema rengini ayarla
    const themeColor = theme === 'dark' ? '#000000' : '#EEF6FF';
    themeColorMeta.content = themeColor;
    
    // Smooth transition için body'ye class ekle
    document.body.classList.add('theme-transitioning');
    setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
    }, 400);
}

// ==================== ANIMATIONS PACKAGE ====================

/**
 * 1. CONFETTI EFFECT - Celebration Animation
 */
function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#0A84FF', '#34C759', '#FF9500', '#FF3B30', '#58B3FF'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.width = confetti.style.height = (Math.random() * 10 + 5) + 'px';
        container.appendChild(confetti);
    }
    
    // Remove container after animation
    setTimeout(() => {
        document.body.removeChild(container);
    }, 5000);
    
    console.log('🎉 Confetti patlat!');
}

/**
 * 2. SMOOTH PAGE TRANSITIONS
 */
function showScreenWithAnimation(screenName) {
    const currentScreen = document.querySelector('.screen.active');
    const nextScreen = screens[screenName];
    
    if (!nextScreen || currentScreen === nextScreen) return;
    
    // Exit animation for current screen
    if (currentScreen) {
        currentScreen.classList.add('exiting');
        setTimeout(() => {
            currentScreen.classList.remove('active', 'exiting');
        }, 500);
    }
    
    // Enter animation for next screen
    setTimeout(() => {
        nextScreen.classList.add('active');
        console.log(`🎬 Ekran geçişi: ${screenName}`);
    }, currentScreen ? 300 : 0);
}

/**
 * 3. RIPPLE EFFECT - Material Design Ripple
 */
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

/**
 * 4. ANIMATE COUNTER - Number Count Up
 */
function animateCounter(element, start, end, duration = 1000) {
    let startTimestamp = null;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    
    window.requestAnimationFrame(step);
}

/**
 * 5. STAGGER ANIMATION - Animate items one by one
 */
function staggerAnimation(elements, delay = 100) {
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('stagger-item');
        }, index * delay);
    });
}

/**
 * 6. SHAKE ANIMATION - For errors
 */
function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

/**
 * 7. PULSE ANIMATION - Draw attention
 */
function pulseElement(element, duration = 2000) {
    element.classList.add('pulse');
    setTimeout(() => {
        element.classList.remove('pulse');
    }, duration);
}

/**
 * 8. BOUNCE ANIMATION
 */
function bounceElement(element) {
    element.classList.add('bounce');
    setTimeout(() => {
        element.classList.remove('bounce');
    }, 1000);
}

/**
 * 9. SCALE UP ANIMATION
 */
function scaleUpElement(element) {
    element.classList.add('scale-up');
}

/**
 * 10. TADA CELEBRATION ANIMATION
 */
function tadaAnimation(element) {
    element.classList.add('tada');
    setTimeout(() => {
        element.classList.remove('tada');
    }, 1000);
}

// ==================== APPLY ANIMATIONS TO APP ====================

// Add ripple effect to all buttons
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-outline, .btn-success');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });
    
    console.log('✨ Animasyonlar yüklendi');
});

// Override showScreen function with animated version
const originalShowScreen = showScreen;
showScreen = function(screenName) {
    showScreenWithAnimation(screenName);
};

console.log('🚀 app.js yüklendi');


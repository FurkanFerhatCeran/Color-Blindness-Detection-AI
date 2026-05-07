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
        '4_DejaVuSanstheme_4 type_3.png',
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

// "Göremiyorum" için locale / büyük-küçük harf sorunlarına girmeyen sabit değer
const CANT_SEE_SENTINEL = '__CANT_SEE__';

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
    answerDetails: document.getElementById('answer-details')
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
    
    // Input'u temizle ve cevabı özel sentinel olarak kaydet (null yerine)
    elements.answerInput.value = '';
    saveCurrentAnswer(CANT_SEE_SENTINEL);
    
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
    // Input boşsa, önceki cevabı kontrol et (CANT_SEE_SENTINEL olabilir)
        const currentAnswer = userAnswers[currentQuestionIndex];
        const hasAnswer = currentAnswer && currentAnswer !== null && currentAnswer !== undefined && currentAnswer !== '';
        
        elements.nextBtn.disabled = !hasAnswer;
        if (currentQuestionIndex === getTotalQuestions() - 1) {
            elements.submitBtn.disabled = !hasAnswer;
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
    
    // Loading screen'i gizle
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
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
    
    // Önceki cevabı göster
    const previousAnswer = userAnswers[index];
    // Sentinel değerini input'ta göstermeyelim (input boş kalsın)
    elements.answerInput.value = (previousAnswer && previousAnswer !== CANT_SEE_SENTINEL) ? previousAnswer : '';
    
    // Cevap verilmiş mi kontrol et (boş, null, undefined olmamalı)
    const isAnswered = previousAnswer !== null && previousAnswer !== undefined && previousAnswer !== '';
    
    // Buton durumlarını güncelle
    elements.prevBtn.disabled = index === 0;
    elements.nextBtn.disabled = !isAnswered;
    
    // Son soru mu?
    if (index === getTotalQuestions() - 1) {
        elements.nextBtn.style.display = 'none';
        elements.submitBtn.style.display = 'inline-block';
        elements.submitBtn.disabled = !isAnswered;
    } else {
        elements.nextBtn.style.display = 'inline-block';
        elements.submitBtn.style.display = 'none';
    }
    
    // Input'a odaklan
    elements.answerInput.focus();
}

function saveCurrentAnswer(answer) {
    userAnswers[currentQuestionIndex] = answer;
    console.log(`💾 Cevap kaydedildi [Soru ${currentQuestionIndex + 1}]: "${answer}"`);
    console.log(`📊 Tüm cevaplar:`, userAnswers);
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
    console.log('📋 Kullanıcı Cevapları:', userAnswers);
    
    // Cevapsız (null/undefined/boş) soruları otomatik olarak "Göremiyorum" say (yanlış)
    const unansweredIndexes = userAnswers
        .map((a, i) => (a === null || a === undefined || a === '') ? i : null)
        .filter(i => i !== null);

    if (unansweredIndexes.length > 0) {
        console.log('ℹ️ Cevapsız sorular otomatik "Göremiyorum" sayılacak:', unansweredIndexes.map(i => i + 1));
        userAnswers = userAnswers.map(a => (a === null || a === undefined || a === '') ? CANT_SEE_SENTINEL : a);
        showToast(`ℹ️ ${unansweredIndexes.length} boş soru "Göremiyorum" sayıldı`, 'info');
    }
    
    // Yükleme ekranını göster
    showScreen('loading');
    
    // API'ye gönderilecek veri formatı
    const imagesForPayload = getCurrentImages();
    const payload = {
        answers: imagesForPayload.map((image, index) => ({
            image,
            user_answer: userAnswers[index]
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
    
    // Teşhis
    elements.resultDiagnosis.textContent = results.diagnosis || 'Belirsiz';
    elements.resultDescription.textContent = results.description || '';
    
    // İkon değiştir
    const diagnosis = results.diagnosis || '';
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
    
    // İstatistikler
    const stats = results.statistics || {};
    elements.statTotal.textContent = stats.total_tests || 0;
    elements.statCorrect.textContent = stats.correct || 0;
    elements.statWrong.textContent = stats.wrong || 0;
    elements.statAccuracy.textContent = `${stats.accuracy || 0}%`;
    
    // Güven skoru
    const confidence = results.confidence || 0;
    elements.confidenceFill.style.width = `${confidence}%`;
    elements.confidenceValue.textContent = `${confidence}%`;
    
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
    
    // Sonuç ekranını göster
    showScreen('result');
}

function displayDetailedResults(detailedResults) {
    elements.answerDetails.innerHTML = '';
    
    detailedResults.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = `answer-item ${result.correct ? 'correct' : 'wrong'}`;
        
        // Kullanıcı cevabını formatla
        let userAnswerDisplay = result.user_answer;
        if (!userAnswerDisplay || userAnswerDisplay === CANT_SEE_SENTINEL || userAnswerDisplay === 'null') {
            userAnswerDisplay = 'Göremiyorum';
        }
        
        resultItem.innerHTML = `
            <div class="answer-number">#${index + 1}</div>
            <div class="answer-info">
                <div class="answer-label">Görsel: ${result.image}</div>
                <div class="answer-comparison">
                    <span>Sizin Cevabınız: <strong>${userAnswerDisplay}</strong></span>
                    <span>Doğru Cevap: <strong>${result.correct_answer}</strong></span>
                </div>
                <div class="answer-type">Tip: ${result.test_type}</div>
            </div>
            <div class="answer-status">
                ${result.correct ? '✅' : '❌'}
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

console.log('🚀 app.js yüklendi');


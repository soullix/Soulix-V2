// Set launch date
// Option 1: Specific date and time (UNCOMMENT AND EDIT THIS)
// const launchDate = new Date('2025-12-01T00:00:00');

// Option 2: Hours from now (currently 36 hours)
const launchDate = new Date();
launchDate.setHours(launchDate.getHours() + 36);

// Option 3: Days from now
// const launchDate = new Date();
// launchDate.setDate(launchDate.getDate() + 7); // 7 days from now

// Update countdown
function updateCountdown() {
  const now = new Date().getTime();
  const distance = launchDate.getTime() - now;

  // Calculate time units
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // Format numbers with leading zeros
  const formatNumber = (num) => num.toString().padStart(2, '0');

  // Update with flip animation
  updateFlipCounter('days', formatNumber(days));
  updateFlipCounter('hours', formatNumber(hours));
  updateFlipCounter('minutes', formatNumber(minutes));
  updateFlipCounter('seconds', formatNumber(seconds));

  // Check if countdown is finished
  if (distance < 0) {
    clearInterval(countdownInterval);
    document.querySelector('.countdown').innerHTML = '<h1 style="color: inherit; font-size: 3rem;">🎉 We\'re Live! 🎉</h1>';
  }
}

// Update flip counter with animation
function updateFlipCounter(id, newValue) {
  const element = document.getElementById(id);
  const backElement = document.getElementById(id + '-back');
  
  if (element && element.textContent !== newValue) {
    if (backElement) {
      backElement.textContent = newValue;
    }
    
    const card = element.closest('.flip-card-inner');
    if (card) {
      card.style.transform = 'rotateX(180deg)';
      setTimeout(() => {
        element.textContent = newValue;
        card.style.transform = 'rotateX(0deg)';
      }, 300);
    } else {
      element.textContent = newValue;
    }
  }
}

// Video Introduction Handling
function setupVideoIntro() {
  const videoOverlay = document.getElementById('videoOverlay');
  const introVideo = document.getElementById('introVideo');
  const skipBtn = document.getElementById('skipBtn');
  const enterBtn = document.getElementById('enterBtn');
  const videoFallback = document.querySelector('.video-fallback');
  
  const videoSources = [
    'Something Big is Coming Soon..mp4'
  ];
  
  // Function to play video
  function playVideo() {
    // Ensure video is muted for autoplay
    introVideo.muted = true;
    introVideo.setAttribute('playsinline', '');
    introVideo.setAttribute('webkit-playsinline', '');
    
    introVideo.src = videoSources[0];
    introVideo.load();
    
    // Wait for video to be ready
    introVideo.addEventListener('loadeddata', function onLoaded() {
      introVideo.removeEventListener('loadeddata', onLoaded);
      
      const playPromise = introVideo.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Video playing successfully');
          videoFallback.style.display = 'none';
        }).catch(error => {
          console.log('Autoplay blocked, showing fallback');
          showFallback();
        });
      }
    }, { once: true });
    
    // Fallback if video doesn't load in 3 seconds
    setTimeout(() => {
      if (introVideo.paused && introVideo.readyState < 3) {
        console.log('Video taking too long to load, showing fallback');
        showFallback();
      }
    }, 3000);
  }
  
  // Show fallback animation
  function showFallback() {
    videoFallback.style.display = 'block';
    videoFallback.classList.add('show');
  }
  
  // Hide video overlay
  function hideVideoOverlay() {
    videoOverlay.classList.add('hidden');
    setTimeout(() => {
      if (videoOverlay && videoOverlay.parentNode) {
        videoOverlay.style.display = 'none';
      }
    }, 1000);
  }
  
  // Handle video end
  introVideo.addEventListener('ended', () => {
    hideVideoOverlay();
  });
  
  // Handle video load error
  introVideo.addEventListener('error', () => {
    console.log('Video failed to load');
    showFallback();
  });
  
  // Skip button handler
  skipBtn.addEventListener('click', () => {
    hideVideoOverlay();
  });
  
  // Enter button handler (for fallback)
  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      hideVideoOverlay();
    });
  }
  
  // Start playing video
  playVideo();
}

// Email validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Show notification
function showNotification(message, type = 'success') {
  // Remove existing notification
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove notification after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.5s ease forwards';
    setTimeout(() => notification.remove(), 500);
  }, 4000);
}

// Handle email subscription
function setupForm() {
  const emailInput = document.getElementById('emailInput');
  const notifyBtn = document.getElementById('notifyBtn');
  
  if (notifyBtn && emailInput) {
    notifyBtn.addEventListener('click', () => {
      const email = emailInput.value.trim();
      
      if (email && validateEmail(email)) {
        // For static site, just show success message
        // In production, you'd send this to a backend or service
        showNotification('Thank you! We\'ll notify you when we launch! 🚀', 'success');
        emailInput.value = '';
        
        // Optional: Log to console (you can integrate with Google Sheets, FormSpree, etc.)
        console.log('Email submitted:', email);
      } else {
        showNotification('Please enter a valid email address.', 'error');
      }
    });
    
    // Submit on Enter key
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        notifyBtn.click();
      }
    });
  }
}

// Initialize everything
function init() {
  // Setup video intro
  setupVideoIntro();
  
  // Setup countdown
  updateCountdown();
  const countdownInterval = setInterval(updateCountdown, 1000);
  
  // Setup form
  setupForm();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

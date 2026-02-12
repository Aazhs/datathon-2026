
document.addEventListener('DOMContentLoaded', function () {
    const fullText = "Solve real-world problem statements. Build. Present. Win.";
    let charIndex = 0;
    const heroSubElement = document.querySelector('.hero-sub');

    if (heroSubElement) {
        heroSubElement.innerHTML = '<span></span><span class="cursor"></span>';
        const textSpan = heroSubElement.querySelector('span');
        const cursorSpan = heroSubElement.querySelector('.cursor');
        
        function type() {
            if (charIndex < fullText.length) {
                textSpan.textContent += fullText.charAt(charIndex);
                charIndex++;
                setTimeout(type, 50); // Typing speed
            } else {
                // Animation finished
                cursorSpan.style.display = 'none'; // Hide cursor
            }
        }

        type();
    }
});

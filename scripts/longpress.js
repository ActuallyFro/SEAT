/* Long Press Handler for Mobile Devices
 * This script adds long-press functionality as an alternative to double-tap
 * for mobile devices to prevent conflicts with browser zoom.
 */

class LongPress {
  constructor(element, callback, duration = null) {
    this.element = element;
    this.callback = callback;
    // Use configurable duration from settings, fall back to provided duration or default
    this.duration = duration || (window.getLongPressDuration ? window.getLongPressDuration() : 500);
    
    this.timer = null;
    this.isTouch = false;
    
    this.startX = 0;
    this.startY = 0;
    this.moveThreshold = 10; // Pixels of movement allowed before canceling
    
    this.init();
  }
  
  // Method to update duration from settings
  updateDuration(newDuration) {
    this.duration = newDuration;
  }
  
  init() {
    // Touch events (mobile)
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
  }
  
  handleTouchStart(e) {
    this.isTouch = true;
    if (e.touches.length === 1) {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      
      this.timer = setTimeout(() => {
        this.callback(e);
      }, this.duration);
    }
  }
  
  handleTouchMove(e) {
    if (this.timer && e.touches.length === 1) {
      const moveX = Math.abs(e.touches[0].clientX - this.startX);
      const moveY = Math.abs(e.touches[0].clientY - this.startY);
      
      // If moved more than threshold, cancel the timer
      if (moveX > this.moveThreshold || moveY > this.moveThreshold) {
        this.clearTimer();
      }
    }
  }
  
  handleTouchEnd() {
    this.clearTimer();
    this.isTouch = false;
  }
  
  handleTouchCancel() {
    this.clearTimer();
    this.isTouch = false;
  }
  
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  
  // For cleaning up (if needed)
  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
  }
}

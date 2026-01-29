import { useEffect } from 'react'

export const useConfetti = (trigger: boolean) => {
  useEffect(() => {
    if (!trigger) return
    
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
    const particles = 30
    
    for (let i = 0; i < particles; i++) {
      const particle = document.createElement('div')
      particle.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        pointer-events: none;
        z-index: 9999;
        border-radius: 50%;
        left: 50%;
        top: 50%;
        animation: confetti 1s ease-out forwards;
      `
      
      particle.style.setProperty('--x', (Math.random() - 0.5) * 400 + 'px')
      particle.style.setProperty('--y', (Math.random() - 0.5) * 400 + 'px')
      
      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 1000)
    }
  }, [trigger])
}

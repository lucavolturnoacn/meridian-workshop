import { ref, computed } from 'vue'

const isDark = ref(
  typeof window !== 'undefined' &&
  (localStorage.getItem('theme') === 'dark' ||
   (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches))
)

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

if (typeof window !== 'undefined') {
  applyTheme(isDark.value)
}

export function useTheme() {
  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme(isDark.value)
  }

  return { isDark, toggleTheme }
}

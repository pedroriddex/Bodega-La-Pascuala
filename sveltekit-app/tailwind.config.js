import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: '#214593', // Mapping primary to brand blue for convenience
				secondary: '#FABE40', // Mapping secondary to brand yellow
				brand: {
					blue: '#214593',
					yellow: '#FABE40',
				},
			},
			fontFamily: {
				sans: ['Montserrat', 'sans-serif'],
			},
		},
	},
	plugins: [typography],
}

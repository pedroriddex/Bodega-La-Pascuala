
import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CheckoutState {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    saveInfo: boolean;
    method: 'pickup' | 'delivery';
    address: string;
    city: string;
    zip: string;
    saveAddress: boolean;
    notes: string;
}

const initialState: CheckoutState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    saveInfo: false,
    method: 'pickup',
    address: '',
    city: '',
    zip: '',
    saveAddress: false,
    notes: ''
};

function createCheckoutStore() {
    const { subscribe, set, update } = writable<CheckoutState>(initialState);

    return {
        subscribe,
        set,
        update,
        reset: () => set(initialState),
        loadFromStorage: () => {
            if (!browser) return;
            
            const savedPersonal = localStorage.getItem('pascuala_personal');
            const savedAddress = localStorage.getItem('pascuala_address');
            
            update(state => {
                let newState = { ...state };
                
                if (savedPersonal) {
                    try {
                        const parsed = JSON.parse(savedPersonal);
                        newState = { ...newState, ...parsed, saveInfo: true };
                    } catch (e) { console.error(e); }
                }

                if (savedAddress) {
                    try {
                        const parsed = JSON.parse(savedAddress);
                        newState = { ...newState, ...parsed, saveAddress: true };
                    } catch (e) { console.error(e); }
                }
                
                return newState;
            });
        },
        persist: (state: CheckoutState) => {
            if (!browser) return;

            if (state.saveInfo) {
                localStorage.setItem('pascuala_personal', JSON.stringify({
                    firstName: state.firstName,
                    lastName: state.lastName,
                    email: state.email,
                    phone: state.phone
                }));
            } else {
                localStorage.removeItem('pascuala_personal');
            }

            if (state.saveAddress) {
                localStorage.setItem('pascuala_address', JSON.stringify({
                    method: state.method,
                    address: state.address,
                    city: state.city,
                    zip: state.zip
                }));
            } else {
                localStorage.removeItem('pascuala_address');
            }
        }
    };
}

export const checkout = createCheckoutStore();

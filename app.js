// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Импорт конфигурации Supabase
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Инициализация Supabase клиента
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Класс для управления событиями
class EventManager {
    constructor() {
        this.initializeApp();
        this.initializeEventListeners();
        this.setMinDate();
    }

    initializeApp() {
        // Раскрываем на весь экран
        tg.expand();
        tg.enableClosingConfirmation();

        // Настраиваем цвета под тему Telegram
        this.updateThemeColors();

        // Получаем данные пользователя
        this.user = tg.initDataUnsafe?.user || {};
    }

    updateThemeColors() {
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
        document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
        document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
        document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
    }

    initializeEventListeners() {
        // Элементы DOM
        this.form = document.getElementById('event-form');
        this.modal = document.getElementById('modal');
        this.createEventBtn = document.getElementById('createEventBtn');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.eventsList = document.getElementById('eventsList');
        // Элемент для отображения имени пользователя
        this.userInfoEl = document.getElementById('user-info');
        this.displayUserInfo();

        // Поля формы
        this.fields = {
            name: document.getElementById('event-name'),
            date: document.getElementById('event-date'),
            time: document.getElementById('event-time'),
            location: document.getElementById('event-location'),
            description: document.getElementById('event-description')
        };

        // Элементы ошибок
        this.errorElements = {
            name: document.getElementById('name-error'),
            date: document.getElementById('date-error'),
            time: document.getElementById('time-error'),
            location: document.getElementById('location-error'),
            description: document.getElementById('description-error')
        };

        // Обработчики событий
        this.createEventBtn.addEventListener('click', () => this.openModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Валидация полей
        Object.keys(this.fields).forEach(field => {
            this.fields[field].addEventListener('input', () => this.validateField(field));
            this.fields[field].addEventListener('blur', () => this.validateField(field));
        });

        // Обработчик изменения темы
        tg.onEvent('themeChanged', () => this.updateThemeColors());
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        this.fields.date.min = today;
    }

    openModal() {
        this.modal.classList.add('active');
        tg.MainButton.setText('Создать событие');
        tg.MainButton.show();
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.form.reset();
        this.clearErrors();
        tg.MainButton.hide();
    }

    validateField(fieldName) {
        const field = this.fields[fieldName];
        const errorElement = this.errorElements[fieldName];
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'name':
                if (field.value.length < 3) {
                    isValid = false;
                    errorMessage = 'Название должно содержать минимум 3 символа';
                } else if (field.value.length > 100) {
                    isValid = false;
                    errorMessage = 'Название не должно превышать 100 символов';
                }
                break;

            case 'date':
                const selectedDate = new Date(field.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (selectedDate < today) {
                    isValid = false;
                    errorMessage = 'Дата не может быть в прошлом';
                }
                break;

            case 'time':
                if (!field.value) {
                    isValid = false;
                    errorMessage = 'Выберите время';
                }
                break;

            case 'location':
                if (field.value.length < 3) {
                    isValid = false;
                    errorMessage = 'Место должно содержать минимум 3 символа';
                } else if (field.value.length > 200) {
                    isValid = false;
                    errorMessage = 'Место не должно превышать 200 символов';
                }
                break;

            case 'description':
                if (field.value.length < 10) {
                    isValid = false;
                    errorMessage = 'Описание должно содержать минимум 10 символов';
                } else if (field.value.length > 1000) {
                    isValid = false;
                    errorMessage = 'Описание не должно превышать 1000 символов';
                }
                break;
        }

        this.showError(fieldName, isValid, errorMessage);
        return isValid;
    }

    showError(fieldName, isValid, message) {
        const errorElement = this.errorElements[fieldName];
        if (!isValid) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        } else {
            errorElement.textContent = '';
            errorElement.classList.remove('visible');
        }
    }

    clearErrors() {
        Object.keys(this.errorElements).forEach(field => {
            this.errorElements[field].textContent = '';
            this.errorElements[field].classList.remove('visible');
        });
    }

    validateForm() {
        let isValid = true;
        Object.keys(this.fields).forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        return isValid;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            tg.showPopup({
                title: 'Ошибка валидации',
                message: 'Пожалуйста, проверьте правильность заполнения полей',
                buttons: [{ type: 'ok' }]
            });
            return;
        }

        const eventData = {
            name: this.fields.name.value,
            date: this.fields.date.value,
            time: this.fields.time.value,
            location: this.fields.location.value,
            description: this.fields.description.value,
            creator_id: this.user?.id,
            creator_name: this.user?.first_name || 'Пользователь',
            created_at: new Date().toISOString()
        };

        try {
            // Сохраняем событие в Supabase
            const { data, error } = await supabase
                .from('events')
                .insert([eventData])
                .select();

            if (error) throw error;

            // Добавляем событие в список
            this.addEventToList(data[0]);
            
            // Показываем уведомление об успехе
            tg.showPopup({
                title: 'Успех',
                message: 'Событие успешно создано',
                buttons: [{ type: 'ok' }]
            });

            this.closeModal();
        } catch (error) {
            console.error('Error creating event:', error);
            tg.showPopup({
                title: 'Ошибка',
                message: 'Не удалось создать событие. Попробуйте позже.',
                buttons: [{ type: 'ok' }]
            });
        }
    }

    addEventToList(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-card';
        
        const eventDate = new Date(`${event.date}T${event.time}`);
        
        eventElement.innerHTML = `
            <h3>${event.name}</h3>
            <p class="event-date">${eventDate.toLocaleString()}</p>
            <p class="event-location">📍 ${event.location}</p>
            <p class="event-description">${event.description}</p>
            ${event.creator ? `<p class="event-creator">👤 ${event.creator.first_name || 'Пользователь'}</p>` : ''}
        `;
        
        this.eventsList.insertBefore(eventElement, this.eventsList.firstChild);
    }

    async loadEvents() {
        try {
            const { data: events, error } = await supabase
                .from('events')
                .select('*')
                .order('date', { ascending: true });

            if (error) throw error;

            // Очищаем список событий
            this.eventsList.innerHTML = '';

            // Добавляем события в список
            events.forEach(event => this.addEventToList(event));

        } catch (error) {
            console.error('Error loading events:', error);
            tg.showPopup({
                title: 'Ошибка',
                message: 'Не удалось загрузить события',
                buttons: [{ type: 'ok' }]
            });
        }
    }

    // Отображение имени пользователя в шапке
    displayUserInfo() {
        if (this.userInfoEl && this.user) {
            const fullName = [this.user.first_name, this.user.last_name].filter(Boolean).join(' ');
            this.userInfoEl.textContent = fullName;
        }
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    const eventManager = new EventManager();
    // Загружаем события при старте
    eventManager.loadEvents();
}); 
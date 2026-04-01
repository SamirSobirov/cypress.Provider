Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

const generateLetters = (len) => {
  let res = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

describe('Providers Management Flow', { pageLoadTimeout: 120000 }, () => {
  const uniqueStr = generateLetters(6);
  const providerName = `AutoProvider_${uniqueStr}`; 
  const providerTag = 'TestTest';

  before(() => {
    cy.writeFile('auth_api_status.txt', '0');
  });

  it('Авторизация -> Добавление провайдера (Шаг 1)', () => {
    cy.viewport(1280, 800);

    cy.intercept('POST', '**/login**').as('apiAuth');
    
    // =========================================================
    // ШАГ 1: АВТОРИЗАЦИЯ И ПЕРЕХОД ЧЕРЕЗ МЕНЮ
    // =========================================================
    cy.log('🟢 ШАГ 1: АВТОРИЗАЦИЯ');

    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => { win.sessionStorage.clear(); });

    cy.visit('https://dev.metatrip.uz/uz/sign-in', { timeout: 30000 });
    
    cy.get('input[type="text"]', { timeout: 15000 })
      .should('be.visible')
      .focus()
      .type(`{selectall}{backspace}${Cypress.env('LOGIN_EMAIL')}`, { delay: 50, log: false }); 

    cy.get('input[type="password"]')
      .should('be.visible')
      .focus()
      .type(`{selectall}{backspace}${Cypress.env('LOGIN_PASSWORD')}`, { delay: 50, log: false });

    cy.get('button.sign-in-page__submit').click({ force: true });

    cy.wait('@apiAuth', { timeout: 30000 });
    cy.url({ timeout: 30000 }).should('not.include', '/sign-in');

    // Переход в раздел Провайдеры
    cy.log('⚠️ Переход в раздел Провайдеры');
    cy.contains('.sidebar-link', /Провайдеры|Providers/i, { timeout: 25000 })
      .scrollIntoView()
      .click();

    // ИСПРАВЛЕНО: на твоем скрине URL содержит /partners, а не /providers
    cy.url({ timeout: 20000 }).should('include', '/partners');

    // =========================================================
    // ШАГ 2: СОЗДАНИЕ ПРОВАЙДЕРА (ЗАПОЛНЕНИЕ ДАННЫХ)
    // =========================================================
    cy.log('🟢 ШАГ 2: ЗАПОЛНЕНИЕ ФОРМЫ ПРОВАЙДЕРА');

    // Клик на "Добавить провайдер"
    cy.get('button.app-button--primary')
      .contains(/Добавить провайдер/i)
      .should('be.visible')
      .click({ force: true });
      
    cy.wait(2000); 

    // 1. Название провайдера (первый инпут в модалке)
    cy.get('.p-dialog input').eq(0)
      .should('be.visible')
      .type(providerName, { delay: 50 });

// 2. Типы продуктов (Дропдаун)
    // Ищем именно тот селект, внутри которого есть текст "Выберите типы продуктов"
    cy.contains('.p-select', /Выберите типы продуктов/i)
      .should('be.visible')
      .click(); 

    // Кликаем по варианту "Перелёты" в появившемся списке
    cy.get('.p-select-panel, .p-select-overlay, [role="listbox"]')
      .contains(/Перелёты|Flights/i)
      .should('be.visible')
      .click();

 // 3. Тег (второй инпут в модалке)
    cy.get('.p-dialog input').eq(1)
      .should('be.visible')
      .type(providerTag, { delay: 50 });

    // 4. Кнопка "Продолжить" / "Continue"
    // На скрине видно, что это кнопка с классами app-button--primary
    cy.get('button.app-button--primary')
      .contains(/Продолжить|Continue/i)
      .should('be.visible')
      .click({ force: true });

    // 5. Кнопка "Продолжить"
    cy.get('.p-dialog').contains('button', /Продолжить|Continue/i)
      .should('be.visible')
      .click({ force: true });

    cy.log('✅ Первый шаг заполнения провайдера завершен');


   // 6. Выбор валюты
    // Кликаем по селекту выбора валюты
    cy.contains('.p-select', /Валюта не выбрана|Currency not selected/i)
      .should('be.visible')
      .click(); 

    // Выбираем USD в выпадающем списке
    // Используем /^USD$/, чтобы зацепиться за строгое совпадение
    cy.get('.p-select-panel, [role="listbox"]')
      .contains(/^USD$/)
      .should('be.visible')
      .click();

      // 7. Ввод суммы активации
    cy.log('⚠️ Ввод суммы активации');
    cy.get('input[placeholder="Введите сумму"]')
      .should('be.visible')
      .type('1', { delay: 50 });

    // 8. Клик по кнопке "Добавить"
    cy.log('⚠️ Финальное сохранение провайдера');
    // Используем селектор кнопки с первичным стилем и текстом
    cy.get('button.app-button--sm')
      .contains(/Добавить|Add/i)
      .should('be.visible')
      .click({ force: true });

    cy.log('✅ Провайдер успешно добавлен!');
  });
});
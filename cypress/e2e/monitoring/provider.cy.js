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

    cy.log('⚠️ Переход в раздел Провайдеры');
    cy.contains('.sidebar-link', /Провайдеры|Providers/i, { timeout: 25000 })
      .scrollIntoView()
      .click();

    cy.url({ timeout: 20000 }).should('include', '/partners');

    // =========================================================
    // ШАГ 2: СОЗДАНИЕ ПРОВАЙДЕРА (ЗАПОЛНЕНИЕ ДАННЫХ)
    // =========================================================
    cy.log('🟢 ШАГ 2: ЗАПОЛНЕНИЕ ФОРМЫ ПРОВАЙДЕРА');

    cy.get('button.app-button--primary')
      .contains(/Добавить провайдер/i)
      .should('be.visible')
      .click({ force: true });
      
    cy.wait(2000); 

    // 1. Название провайдера
    cy.get('.p-dialog input').eq(0)
      .should('be.visible')
      .type(providerName, { delay: 50 });

// 2. Типы продуктов (Дропдаун)
    cy.contains('.p-select', /Выберите типы продуктов/i)
      .should('be.visible')
      .click(); 

    cy.get('.p-select-panel, .p-select-overlay, [role="listbox"]')
      .contains(/Перелёты|Flights/i)
      .should('be.visible')
      .click();

 // 3. Тег 
    cy.get('.p-dialog input').eq(1)
      .should('be.visible')
      .type(providerTag, { delay: 50 });

    // 4. 
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
    cy.contains('.p-select', /Валюта не выбрана|Currency not selected/i)
      .should('be.visible')
      .click(); 

    cy.get('.p-select-panel, [role="listbox"]')
      .contains(/^USD$/)
      .should('be.visible')
      .click();

    cy.log('⚠️ Ввод суммы активации');
    cy.get('input[placeholder="Введите сумму"]')
      .should('be.visible')
      .type('1', { delay: 50 });

    cy.log('⚠️ Финальное сохранение провайдера');
    cy.get('button.app-button--sm')
      .contains(/Добавить|Add/i)
      .should('be.visible')
      .click({ force: true });

    cy.log('✅ Провайдер успешно добавлен!');

    // =========================================================
    // ШАГ 3: УДАЛЕНИЕ ПРОВАЙДЕРА
    // =========================================================
    cy.log('🟢 ШАГ 3: УДАЛЕНИЕ ПРОВАЙДЕРА');

    cy.get('.p-dialog').should('not.exist'); 
    cy.wait(2000);

    cy.log('⚠️ Открытие деталей провайдера');
    cy.contains('tr', providerName, { timeout: 15000 })
      .find('button.action-btn')
      .should('be.visible')
      .click({ force: true });

    cy.log('⚠️ Переход в Настройки');
    cy.get('button.app-button--secondary')
      .contains(/Настройки|Settings/i)
      .should('be.visible')
      .click({ force: true });

    cy.log('⚠️ Инициация удаления');
    cy.get('button.app-button--secondary')
      .contains(/Удалить|Delete/i)
      .should('be.visible')
      .click({ force: true });

    cy.log('⚠️ Подтверждение удаления');
    cy.get('.p-dialog button.app-button--danger')
      .contains(/Удалить|Delete/i)
      .should('be.visible')
      .click({ force: true });

    cy.log('✅ Провайдер успешно удален!');
  });
});
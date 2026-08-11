Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver')) {
    return false; 
  }
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

    cy.visit('https://b2b.metatrip.asia/sign-in', { timeout: 30000 });
    
    // НОВЫЙ ПОДХОД: Асинхронное получение переменных для авторизации
    cy.env(['LOGIN_EMAIL', 'LOGIN_PASSWORD']).then((envVars) => {
      cy.get('input[type="text"]', { timeout: 15000 })
        .should('be.visible')
        .focus()
        .type(`{selectall}{backspace}${envVars.LOGIN_EMAIL}`, { delay: 50, log: false }); 

      cy.get('input[type="password"]')
        .should('be.visible')
        .focus()
        .type(`{selectall}{backspace}${envVars.LOGIN_PASSWORD}`, { delay: 50, log: false });

      cy.get('button.sign-in-page__submit').click({ force: true });
    });

    cy.wait('@apiAuth', { timeout: 30000 }).then((interception) => {
      const status = interception.response?.statusCode || 500;

      if (status >= 400) {
        cy.writeFile('auth_api_status.txt', `ERROR_${status}`);
        throw new Error(`Auth failed: ${status}`);
      }
    });
    
    cy.url({ timeout: 30000 }).should('not.include', '/sign-in');

    cy.log('⚠️ Переход в раздел Провайдеры');
    cy.contains('.sidebar-link', /Провайдеры|Providers/i, { timeout: 25000 })
      .scrollIntoView()
      .click();

    cy.url({ timeout: 20000 }).should('include', '/partners');

    cy.writeFile('auth_api_status.txt', '1');

    // =========================================================
    // ШАГ 2: СОЗДАНИЕ ПРОВАЙДЕРА (ЗАПОЛНЕНИЕ ДАННЫХ)
    // =========================================================
    cy.log('🟢 ШАГ 2: ЗАПОЛНЕНИЕ ФОРМЫ ПРОВАЙДЕРА');

    // Таймаут ожидания элементов (в CU/GitHub Actions UI отрисовывается медленнее)
    const UI_TIMEOUT = 20000;

    cy.get('button.app-button--primary', { timeout: UI_TIMEOUT })
      .contains(/Добавить провайдер|Add Provider/i)
      .should('be.visible')
      .click({ force: true });

    // Ждём полного открытия диалога перед вводом
    cy.get('.p-dialog', { timeout: UI_TIMEOUT }).should('be.visible');
    cy.wait(1500);

    // 1. Название провайдера
    cy.get('.p-dialog input', { timeout: UI_TIMEOUT }).eq(0)
      .should('be.visible')
      .type(providerName, { delay: 50 });
    cy.wait(500);

    // 2. Типы продуктов (Дропдаун) - УБРАНЫ ПРОБЕЛЫ В РЕГУЛЯРКЕ
    cy.contains('.p-select', /Выберите типы продуктов|Select product types/i, { timeout: UI_TIMEOUT })
      .should('be.visible')
      .click();

    // Ждём, пока раскроется панель со списком
    cy.wait(800);
    cy.get('.p-select-panel, .p-select-overlay, [role="listbox"]', { timeout: UI_TIMEOUT })
      .contains(/Перелёты|Flights/i)
      .should('be.visible')
      .click();
    cy.wait(500);

    // 3. Тег
    cy.get('.p-dialog input', { timeout: UI_TIMEOUT }).eq(1)
      .should('be.visible')
      .type(providerTag, { delay: 50 });
    cy.wait(500);

    // 4. Кнопка "Продолжить" (первая)
    cy.get('button.app-button--primary', { timeout: UI_TIMEOUT })
      .contains(/Продолжить|Continue/i)
      .should('be.visible')
      .click({ force: true });
    cy.wait(1000);

    // 4.5. НОВЫЙ ШАГ: Выбор системы бронирования
    // Без выбора системы кнопка "Продолжить" остаётся заблокированной (app-button--disabled)
    cy.get('.p-dialog', { timeout: UI_TIMEOUT })
      .contains(/Выберите систему бронирования|Select booking system/i)
      .should('be.visible');

    // Выбираем систему бронирования TPCONNECT (запасные варианты — на случай смены списка)
    cy.get('.p-dialog', { timeout: UI_TIMEOUT })
      .contains(/TPCONNECT|DRCT|LINER|MYAGENT/i)
      .should('be.visible')
      .click({ force: true });
    cy.wait(1000);

    // 5. Кнопка "Продолжить" (вторая) — ждём, пока станет активной после выбора системы
    cy.get('.p-dialog', { timeout: UI_TIMEOUT }).contains('button', /Продолжить|Continue/i)
      .should('be.visible')
      .should('not.have.class', 'app-button--disabled')
      .click({ force: true });
    cy.wait(1000);

    cy.log('✅ Первый шаг заполнения провайдера завершен');

    // 6. Выбор валюты - недавно добавили инпут поиска внутри дропдауна
    cy.contains('.p-select', /Валюта не выбрана|Currency not selected/i, { timeout: UI_TIMEOUT })
      .should('be.visible')
      .click();

    // Ждём открытия дропдауна и появления инпута поиска
    cy.wait(800);
    cy.get('.p-select-filter, input[role="searchbox"]', { timeout: UI_TIMEOUT })
      .should('be.visible')
      .type('USD', { delay: 50 });

    // Кликаем на первый элемент отфильтрованного списка
    cy.wait(500);
    cy.get('.p-select-list [role="option"], .p-select-option', { timeout: UI_TIMEOUT })
      .first()
      .should('be.visible')
      .click();
    cy.wait(500);

    cy.log('⚠️ Ввод суммы активации');
    cy.contains(/Сумма Активации|Activation Amount/i, { timeout: UI_TIMEOUT })
      .parent()
      .find('input')
      .should('be.visible')
      .type('1', { delay: 50 });
    cy.wait(500);

    cy.log('⚠️ Финальное сохранение провайдера');
    cy.get('button.app-button--sm', { timeout: UI_TIMEOUT })
      .contains(/Добавить|Add/i)
      .should('be.visible')
      .click({ force: true });

    cy.log('✅ Провайдер успешно добавлен!');
    
    // ФИКСИРУЕМ УСПЕХ ШАГА 2 (Для GitHub Actions)
    cy.writeFile('auth_api_status.txt', '2');

// =========================================================
    // ШАГ 3: РЕДАКТИРОВАНИЕ БАЛАНСА ПРОВАЙДЕРА
    // =========================================================
    cy.log('🟢 ШАГ 3: РЕДАКТИРОВАНИЕ БАЛАНСА ПРОВАЙДЕРА');

    // 1. Переход в детали созданного провайдера по клику на action-btn (Скриншот image_6e2fc1.jpg)
    cy.contains('tr', providerName, { timeout: 15000 })
      .find('button.action-btn')
      .should('be.visible')
      .click({ force: true });

    cy.url({ timeout: 20000 }).should('include', '/partners/');

    // 2. Клик на кнопку "Пополнить баланс" (Скриншот image_6e3041.jpg)
    cy.contains('button.app-button', /Пополнить баланс|Top up balance/i)
      .should('be.visible')
      .click({ force: true });

    // 3. Ожидание модалки и ввод суммы "1" (Скриншот image_6e3324.jpg)
    cy.get('.p-dialog input')
      .should('be.visible')
      .focus()
      .type('1', { delay: 50 });

    // 4. Подтверждение пополнения (Скриншот image_6e3366.jpg)
    cy.get('.p-dialog button')
      .contains(/Пополнить|Top up/i)
      .should('be.visible')
      .click({ force: true });

    // Ожидаем закрытия модального окна баланса
    cy.get('.p-dialog').should('not.exist');
    cy.log('✅ Баланс провайдера успешно обновлен!');


    // =========================================================
    // ШАГ 4: УДАЛЕНИЕ ПРОВАЙДЕРА
    // =========================================================
    cy.log('🟢 ШАГ 4: УДАЛЕНИЕ ПРОВАЙДЕРА');

    // ТАК КАК МЫ УЖЕ ВНУТРИ ДЕТАЛЕЙ, СРАЗУ ЖМЕМ "НАСТРОЙКИ"
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
    
    cy.writeFile('auth_api_status.txt', '3');
  });
});
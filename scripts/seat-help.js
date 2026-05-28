/**
 * seat-help.js — Help / About / Tutorial modal for SEAT
 *
 * Auto-shows on first visit (localStorage flag 'seatHelpShown').
 * Can be re-opened at any time via window.openSEATHelp() or the Help button.
 */
(function () {
  'use strict';

  var HELP_SHOWN_KEY = 'seatHelpShown';

  // ── Tutorial page content ───────────────────────────────────────────────────
  var PAGES = [
    {
      title: 'Welcome',
      content: [
        '<h2>&#128640; Welcome to SEAT</h2>',
        '<p>The <strong>Space Engineers Acquisition Tool</strong> (SEAT) helps you track',
        '<strong>Acquisition Contracts</strong> — missions posted by NPC trade stations',
        'that ask you to deliver specific quantities of items in exchange for',
        '<strong>Space Credits (SC)</strong>.</p>',

        '<p>If you\'ve never played the Space Engineers economy before,',
        'this quick guide will get you up to speed. Use the tabs above',
        'or the <em>Next</em> button below to navigate.</p>',

        '<h3>What you\'ll learn</h3>',
        '<ul>',
        '  <li>How the SE Economy &amp; Trade Stations work</li>',
        '  <li>Who the NPC factions are and how to read their names</li>',
        '  <li>What an Acquisition Contract is and how to run one</li>',
        '  <li>How to log and manage your missions in SEAT</li>',
        '</ul>',

        '<p class="help-tip">&#128161; <strong>Tip:</strong> SEAT works entirely in your browser.',
        'All data is stored locally — nothing is sent to any server.</p>'
      ].join('\n')
    },

    {
      title: 'SE Economy',
      content: [
        '<h2>&#128722; The Space Engineers Economy</h2>',
        '<p>When you start a world with <strong>Economy enabled</strong>, NPC trade',
        'stations are scattered across space and on planets. Each station belongs to a',
        'randomly-named NPC faction and runs a shop &amp; contract board.</p>',

        '<h3>What you can do at a Trade Station</h3>',
        '<ul>',
        '  <li><strong>Buy &amp; Sell items</strong> — ores, ingots, components, tools, and more</li>',
        '  <li><strong>Accept Contracts</strong> — earn SC by completing tasks for the station</li>',
        '  <li><strong>Repair your grid</strong> — pay the station to fix battle damage</li>',
        '  <li><strong>Sell scrap grids</strong> — offload damaged ships for credits via the Salvage service</li>',
        '  <li><strong>Store your grid</strong> — park a vessel and redeploy it later via Grid Storage</li>',
        '</ul>',

        '<h3>Space Credits (SC)</h3>',
        '<p>SC is the in-game currency. Completing contracts, selling items, and',
        'salvaging grids all earn SC. You spend it buying items, paying for repairs,',
        'and expediting grid retrieval. Payments on Acquisition contracts range from',
        'a few thousand SC for small runs up to <strong>millions</strong> for bulk orders.</p>',

        '<h3>Reputation</h3>',
        '<p>Your standing with each faction affects trade discounts and',
        'which contracts you can access. Completing their contracts improves it;',
        'attacking their ships hurts it. Even hostile reputation still allows basic',
        'trading, just with fewer options and no discounts.</p>',

        '<h3>Finding Trade Stations</h3>',
        '<ul>',
        '  <li>Your starting <strong>Drop Pod</strong> contains a datapad with a nearby station\'s GPS.</li>',
        '  <li>Station <strong>billboard datapads</strong> appear in loot containers.</li>',
        '  <li>Press <kbd>H</kbd> to cycle HUD signal modes — stations light up on your radar.</li>',
        '  <li>Contracts at one station can direct you to new ones.</li>',
        '</ul>'
      ].join('\n')
    },

    {
      title: 'NPC Factions',
      content: [
        '<h2>&#127807; NPC Factions &amp; Their Names</h2>',
        '<p>NPC faction names are <strong>randomly generated</strong> by combining a',
        '<em>first-name fragment</em> with a <em>second-name fragment</em>, each contributing',
        'two letters to the 4-letter faction tag.</p>',

        '<p>Example: <span class="faction-badge">ISTC</span> =',
        '<em>Interstellar</em> <code>[IS]</code> + <em>Technologies</em> <code>[TC]</code>',
        '— a <span class="type-tag type-trader">Trader</span> faction.</p>',

        '<h3>Faction Types &amp; What They Specialize In</h3>',
        '<table class="help-table">',
        '  <thead><tr><th>Type</th><th>Specialty</th><th>Example 2nd names</th></tr></thead>',
        '  <tbody>',
        '    <tr><td><span class="type-tag type-miner">[M] Miner</span></td>',
        '        <td>Ores &amp; raw materials</td>',
        '        <td>Minerals, Drillers, Prospectors, Excavators</td></tr>',
        '    <tr><td><span class="type-tag type-trader">[T] Trader</span></td>',
        '        <td>Components &amp; goods</td>',
        '        <td>Commerce, Merchants, Shipping, Traders</td></tr>',
        '    <tr><td><span class="type-tag type-builder">[B] Builder</span></td>',
        '        <td>Ships, rovers &amp; components</td>',
        '        <td>Shipbuilding, Engineering, Heavy Industry</td></tr>',
        '    <tr><td><span class="type-tag type-pirate">[P] Pirate</span></td>',
        '        <td>Weapons &amp; ammo (hostile stations)</td>',
        '        <td>Cartel, Dealers, Raiders, Syndicate</td></tr>',
        '    <tr><td><span class="type-tag type-military">[Mil] Military</span></td>',
        '        <td>Weapons &amp; ammo (allied stations)</td>',
        '        <td>Infantry, Battalion, Recon, Tactical</td></tr>',
        '  </tbody>',
        '</table>',

        '<h3>The first-name pool (shared by all types)</h3>',
        '<p style="font-size:0.9em;color:#aaa">',
        'Clang, Universal, United, Royal, Independent, First Class, Specialized, Rogue,',
        'Secret, The First, Galactic, Intergalactic, Righteous, Star, Imperial,',
        'Revolutionary, Interstellar, Mystic, Sacred, Divine, Enlightened, Sovereign,',
        'Supreme, Unyielding, Merciless',
        '</p>',

        '<h3>Notable permanent factions</h3>',
        '<ul>',
        '  <li><span class="faction-badge">SPRT</span> Space Pirates — default antagonists.</li>',
        '  <li><span class="faction-badge">FCTM</span> The Factorum — permanently hostile; owns Prototech derelicts.</li>',
        '  <li><span class="faction-badge">ROS</span> Results Oriented Sciences — red fleet.</li>',
        '  <li><span class="faction-badge">SOL</span> Sol Cooperative — blue fleet.</li>',
        '  <li><span class="faction-badge">ITW</span> Independent Terran Workers — yellow fleet.</li>',
        '  <li><span class="faction-badge">AGI</span> Argonaut Industries — green fleet.</li>',
        '</ul>'
      ].join('\n')
    },

    {
      title: 'Acquisition Contracts',
      content: [
        '<h2>&#128230; Acquisition Contracts</h2>',
        '<p>An <strong>Acquisition Contract</strong> is posted by a trade station\'s Contract Block.',
        'The station needs a fixed quantity of a specific item.',
        'Your job: source it and deliver it before the deadline.</p>',

        '<h3>Step-by-step</h3>',
        '<ol>',
        '  <li>Visit a Trade Station and open the <strong>Contract Block</strong> (or Economy Overview with <kbd>:</kbd>).</li>',
        '  <li>Select the <strong>Acquisition</strong> tab. Browse available contracts.</li>',
        '  <li><strong>Accept</strong> a contract — note the item, amount, payment, and deadline.</li>',
        '  <li>Source the item by mining, manufacturing, or buying it at another station.</li>',
        '  <li>Return to the <em>same station</em> and open the Contract Block to <strong>fulfil</strong> it.</li>',
        '  <li>Collect your <strong>Space Credits</strong>. Reputation with that faction also improves.</li>',
        '</ol>',

        '<h3>What to look for</h3>',
        '<ul>',
        '  <li><strong>Item type</strong> — What the station wants (ore, ingot, component, tool).</li>',
        '  <li><strong>Amount</strong> — How many units. Can range from dozens to many thousands.</li>',
        '  <li><strong>Payment</strong> — SC on delivery. Compare the SC-per-item rate across contracts.</li>',
        '  <li><strong>Faction type</strong> — Miner/Trader/Builder stations each favour different items.</li>',
        '  <li><strong>Deadline</strong> — Contracts expire if not fulfilled in time; you lose the contract fee.</li>',
        '</ul>',

        '<h3>Pro tips</h3>',
        '<ul>',
        '  <li>Builder factions post the highest-value component contracts.</li>',
        '  <li>Stack multiple contracts for the same item to make a single mining/production run pay off more.</li>',
        '  <li>Keep GPS coordinates for your best-paying stations — SEAT stores these for you.</li>',
        '</ul>'
      ].join('\n')
    },

    {
      title: 'Using SEAT',
      content: [
        '<h2>&#128221; How to Use SEAT</h2>',

        '<h3>&#128196; Logging a new mission</h3>',
        '<ol>',
        '  <li>Select the <strong>Acquisition Item</strong> — type to filter the list.</li>',
        '  <li>Enter the <strong>Amount</strong> required. Use <em>+/−</em> for quick adjustments or type directly.</li>',
        '  <li>Enter the <strong>Payment (SC)</strong> you\'ll receive on delivery.</li>',
        '  <li>Select the <strong>Faction First Name</strong> and <strong>Second Name</strong>',
        '      to identify the station — the 4-letter tag is computed and shown in the table.</li>',
        '  <li><em>Optional:</em> Enter a <strong>Station Name</strong>',
        '      (e.g. <code>ISTC Meridius Station</code>) to override the faction display.</li>',
        '  <li><em>Optional:</em> Paste the station\'s <strong>GPS string</strong>',
        '      so you can copy it back from the table with one click.</li>',
        '  <li>Select <strong>Planet / Moon</strong> and add a <strong>Description</strong> if needed.</li>',
        '  <li>Click <strong>Add Mission</strong>.</li>',
        '</ol>',

        '<h3>&#9989; Tracking progress</h3>',
        '<ul>',
        '  <li>Click the <strong>Produced &#10003;/&#10007;</strong> button once you\'ve gathered the items.</li>',
        '  <li>Click the <strong>Loaded &#10003;/&#10007;</strong> button once items are aboard your ship.</li>',
        '  <li>Click <strong>Remove</strong> after a successful delivery.</li>',
        '</ul>',

        '<h3>&#9999;&#65039; Editing a mission</h3>',
        '<p>Click the <strong>Edit</strong> button in the Actions column (or double-click a row,',
        'or long-press on mobile). The form reloads with that mission\'s data and the',
        'submit button changes to <strong>Update Mission</strong>. Click <strong>Cancel</strong> to discard.</p>',

        '<h3>&#128190; Export &amp; Import</h3>',
        '<p>Use <strong>Export List</strong> to download your missions as a JSON file.',
        'Use <strong>Import List</strong> to restore them.',
        'All fields — including Station GPS and Player Base GPS — are preserved in the export.</p>',

        '<p class="help-tip">&#9888; <strong>Important — Back up your data regularly!</strong><br>',
        'SEAT stores all missions in your browser\'s <strong>localStorage</strong>. This storage',
        'can be wiped by clearing browser data, switching browser profiles, or using private/incognito',
        'mode. <strong>It is not a permanent backup.</strong><br>',
        'After adding or updating missions, SEAT shows a <strong>&#9888; Mission list not backed up</strong>',
        'warning near the Export button. Click <em>Export List</em> to dismiss it and save a copy.</p>',

        '<h3>&#9881;&#65039; Settings (hamburger menu &#9776;)</h3>',
        '<ul>',
        '  <li>Toggle individual <strong>column visibility</strong> in the missions table.</li>',
        '  <li>Adjust the <strong>long-press duration</strong> for mobile editing.</li>',
        '  <li><strong>Reload / Clear Page Cache</strong> to force a fresh reload of all scripts.</li>',
        '</ul>',

        '<p class="help-tip">&#128161; <strong>Tip:</strong> Re-open this guide any time',
        'with the <strong>?</strong> button near the page title.</p>'
      ].join('\n')
    }
  ];

  // ── Modal construction ──────────────────────────────────────────────────────
  var currentPage = 0;

  function buildModal() {
    var modal = document.createElement('div');
    modal.id = 'helpModal';
    modal.className = 'help-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'SEAT Help and Tutorial');

    modal.innerHTML =
      '<div class="help-modal-backdrop" id="helpModalBackdrop"></div>' +
      '<div class="help-modal-content">' +
        '<button class="help-modal-close" id="helpModalClose" aria-label="Close help">&#10005;</button>' +
        '<div class="help-tabs" id="helpTabs" role="tablist"></div>' +
        '<div class="help-body" id="helpBody" role="tabpanel"></div>' +
        '<div class="help-nav">' +
          '<button id="helpPrev">&#8592; Prev</button>' +
          '<span class="help-page-indicator" id="helpPageIndicator"></span>' +
          '<button id="helpNext">Next &#8594;</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Build tab buttons
    var tabsEl = modal.querySelector('#helpTabs');
    PAGES.forEach(function (page, i) {
      var btn = document.createElement('button');
      btn.className = 'help-tab' + (i === 0 ? ' active' : '');
      btn.textContent = page.title;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('data-tab', i);
      btn.addEventListener('click', function () { goToPage(i); });
      tabsEl.appendChild(btn);
    });

    modal.querySelector('#helpModalClose').addEventListener('click', closeHelp);
    modal.querySelector('#helpModalBackdrop').addEventListener('click', closeHelp);
    modal.querySelector('#helpPrev').addEventListener('click', function () { goToPage(currentPage - 1); });
    modal.querySelector('#helpNext').addEventListener('click', function () { goToPage(currentPage + 1); });

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeHelp(); }
      else if (e.key === 'ArrowRight') { goToPage(currentPage + 1); }
      else if (e.key === 'ArrowLeft')  { goToPage(currentPage - 1); }
    });

    goToPage(0);
    return modal;
  }

  function goToPage(n) {
    n = Math.max(0, Math.min(PAGES.length - 1, n));
    currentPage = n;

    var modal = document.getElementById('helpModal');
    if (!modal) return;

    // Tabs
    modal.querySelectorAll('.help-tab').forEach(function (btn, i) {
      btn.classList.toggle('active', i === n);
    });

    // Content
    modal.querySelector('#helpBody').innerHTML = PAGES[n].content;

    // Nav
    var prevBtn = modal.querySelector('#helpPrev');
    var nextBtn = modal.querySelector('#helpNext');
    prevBtn.disabled = (n === 0);
    nextBtn.disabled = (n === PAGES.length - 1);
    modal.querySelector('#helpPageIndicator').textContent = (n + 1) + ' / ' + PAGES.length;

    // Scroll body to top on page change
    modal.querySelector('#helpBody').scrollTop = 0;
  }

  function openHelp() {
    var modal = document.getElementById('helpModal');
    if (!modal) modal = buildModal();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeHelp() {
    var modal = document.getElementById('helpModal');
    if (modal) modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function checkFirstVisit() {
    if (!localStorage.getItem(HELP_SHOWN_KEY)) {
      localStorage.setItem(HELP_SHOWN_KEY, '1');
      setTimeout(openHelp, 600);
    }
  }

  // Public API
  window.openSEATHelp  = openHelp;
  window.closeSEATHelp = closeHelp;

  document.addEventListener('DOMContentLoaded', checkFirstVisit);
}());

/* Nuages Polaires — Premiers pas.
   This guide reads the current session on every render. It stores no progress,
   changes no account data and uses the application's existing navigation. */
(function () {
  'use strict';

  function escapeText(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function state() {
    var user = window.CU;
    if (!user) return { kind: 'guest' };
    var role = typeof window.roleKey === 'function' ? window.roleKey(user) : String(user.role || 'joueur').toLowerCase();
    // Staff may consult someone else's character through CU.pid. Their guide
    // must never mistake that selection for their own account's progression.
    if (role !== 'joueur') return { kind: 'staff', role: role };
    var account = null;
    try { account = typeof window.getCurrentAccount === 'function' ? window.getCurrentAccount() : null; } catch (_error) {}
    var pid = account && Object.prototype.hasOwnProperty.call(account, 'pid') ? account.pid : user.pid;
    if (!pid) return { kind: 'pending', pseudo: account && account.pseudo || user.pseudo || user.name || '' };
    var character = null;
    try { character = typeof window.gpid === 'function' ? window.gpid(pid) : null; } catch (_error) {}
    if (!character) return { kind: 'unavailable' };
    return { kind: 'linked', name: character.name || 'Ton personnage' };
  }

  function button(label, action, primary) {
    return '<button type="button" class="np-steps-button' + (primary ? ' is-primary' : '') + '" onclick="npFirstStepsGo(\'' + action + '\')">' + escapeText(label) + '<span aria-hidden="true">↗</span></button>';
  }

  function statusCopy(current) {
    if (current.kind === 'pending') return {
      label: 'Compte créé · liaison à venir',
      title: 'Ton histoire peut déjà prendre forme.',
      text: 'Ton compte est bien enregistré. Un administrateur doit maintenant le lier à ton personnage. Transmets-lui ton pseudo de compte sur le serveur Discord ; tu peux déjà lire l’univers, les règles et les serments.',
      action: 'serments', actionLabel: 'Découvrir les serments'
    };
    if (current.kind === 'linked') return {
      label: 'Personnage lié', title: current.name + ', la suite t’appartient.',
      text: 'Ta fiche est disponible. Retrouve ton serment, ton équipement et ton journal, puis consulte les événements pour préparer la prochaine aventure.',
      action: 'character', actionLabel: 'Ouvrir mon personnage'
    };
    if (current.kind === 'unavailable') return {
      label: 'Fiche indisponible', title: 'Retrouvons ton personnage.',
      text: 'Une liaison existe sur ton compte, mais la fiche n’est pas disponible pour le moment. Recharge la page. Si le problème persiste, indique ton pseudo à un administrateur sur le serveur Discord.',
      action: 'reload', actionLabel: 'Recharger la page'
    };
    if (current.kind === 'staff') return {
      label: 'Repères pour l’équipe', title: 'Accompagner les premiers pas.',
      text: 'Ce parcours explique l’arrivée d’un joueur. La liaison entre compte et personnage relève d’un administrateur ; tes propres outils restent accessibles dans le menu Outils.',
      action: 'dashboard', actionLabel: 'Revenir au tableau de bord'
    };
    return {
      label: 'Bienvenue dans Nuages Polaires', title: 'Une place dans une histoire collective.',
      text: 'Nuages Polaires se joue en roleplay textuel sur Discord. Ce site en est le compagnon : l’univers, les règles, ta fiche et les rendez-vous de l’aventure.',
      action: 'register', actionLabel: 'Lire le règlement et rejoindre'
    };
  }

  function statusHtml(current, compact) {
    var copy = statusCopy(current);
    var html = '<section class="np-steps-status' + (compact ? ' np-steps-home' : '') + '" data-onboarding-state="' + current.kind + '" aria-label="' + escapeText(copy.label) + '">';
    html += '<div><p class="np-steps-eyebrow">' + escapeText(copy.label) + '</p><h2>' + escapeText(copy.title) + '</h2><p>' + escapeText(copy.text) + '</p>';
    if (current.kind === 'pending' && current.pseudo) html += '<p class="np-steps-account">Pseudo à transmettre : <strong>' + escapeText(current.pseudo) + '</strong></p>';
    if (current.kind === 'pending' && !compact) html += '<p class="np-steps-note">Après la confirmation de l’administrateur, recharge la page pour retrouver ta fiche.</p>';
    html += '</div><div class="np-steps-actions">';
    html += compact ? button('Consulter les premiers pas', 'guide', true) : button(copy.actionLabel, copy.action, true);
    if (current.kind === 'pending' && !compact) html += button('La liaison est faite ? Recharger', 'reload');
    if (current.kind === 'guest' && !compact) html += button('J’ai déjà un compte', 'login');
    return html + '</div></section>';
  }

  function step(number, title, description, action) {
    return '<li class="np-steps-step"><span class="np-steps-number" aria-hidden="true">0' + number + '</span><div><h3>' + title + '</h3><p>' + description + '</p>' + (action || '') + '</div></li>';
  }

  window.renderFirstStepsHome = function () {
    var current = state();
    // Keep staff dashboards focused on their work, with the guide in navigation.
    return current.kind === 'staff' ? '' : statusHtml(current, true);
  };

  window.renderFirstSteps = function (targetId) {
    var target = document.getElementById(targetId);
    if (!target) return false;
    var current = state();
    var connected = current.kind !== 'guest';
    var html = '<div class="np-first-steps"><header class="np-steps-heading"><p class="np-steps-eyebrow">Le Compagnon <span aria-hidden="true">/</span> Guide de départ</p><h1>Les premiers pas<span aria-hidden="true">.</span></h1><p>Prendre ses repères, trouver son serment, puis écrire la suite ensemble.</p></header>';
    html += statusHtml(current, false);
    html += '<section class="np-steps-route" aria-label="Comment commencer"><div class="np-steps-section-title"><h2>Du premier regard au premier récit</h2><p>Quatre repères pour comprendre le parcours.</p></div><ol class="np-steps-list">';
    html += step(1, 'Découvrir le cadre', 'Lis le règlement HRP et le système de jeu. Le synopsis et les serments t’aident à imaginer un personnage qui trouve sa place dans un monde où les constructions ont presque toutes disparu.', button('Lire le règlement HRP', 'rules') + (connected ? button('Comprendre le système de jeu', 'system') : ''));
    html += step(2, 'Créer ton compte', 'L’inscription vient après la lecture du règlement. Ton compte te permet de te connecter au site ; il ne crée pas automatiquement ta fiche de personnage.', connected ? button('Consulter mon compte', 'account') : button('Lire le règlement et m’inscrire', 'register'));
    html += step(3, 'Faire lier ton personnage', 'Échange avec un administrateur sur le serveur Discord et communique ton pseudo de compte. L’administrateur réalise la liaison avec ta fiche. Une fois la liaison confirmée, recharge le site.', current.kind === 'linked' ? button('Retrouver ma fiche', 'character') : '');
    html += step(4, 'Préparer ta première aventure', 'Consulte ta fiche et les événements à venir. Lorsqu’un personnage est lié à ton compte et que les inscriptions sont ouvertes, tu peux participer depuis l’agenda.', connected ? button('Consulter les événements', 'events') : '');
    html += '</ol></section>';
    html += '<section class="np-steps-essentials" aria-label="Bien utiliser le compagnon"><div class="np-steps-section-title"><h2>Trois repères à garder</h2></div><div class="np-steps-cards">';
    html += '<article><span class="np-steps-symbol" aria-hidden="true">◇</span><h3>Une fiche suivie par l’équipe</h3><p>Les statistiques et les récompenses sont gérées par l’équipe selon ses droits. Ton inventaire te permet de déclarer une consommation ; elle retire un exemplaire et conserve une trace dans l’historique, sans appliquer automatiquement ses effets en combat.</p></article>';
    html += '<article><span class="np-steps-symbol" aria-hidden="true">≋</span><h3>Un journal partagé avec les MJ</h3><p>Le journal de ta fiche est lisible par toi, les maîtres du jeu et les administrateurs. Il accompagne ton personnage et ses aventures ; ce n’est pas un espace de notes réservé à toi seul.</p></article>';
    html += '<article><span class="np-steps-symbol" aria-hidden="true">✧</span><h3>Un RPG à explorer à part</h3><p>Le RPG est un prototype solo expérimental, avec sa propre progression et son inventaire. Ses récompenses ne sont pas versées sur ta fiche du compagnon. Le multijoueur à distance n’est pas disponible.</p>' + button('Découvrir le RPG expérimental', 'rpg') + '</article>';
    html += '</div></section>';
    html += '<section class="np-steps-faq" aria-label="Questions fréquentes"><div class="np-steps-section-title"><h2>Avant de partir</h2></div>';
    html += '<details><summary>Mon compte est créé, pourquoi ma fiche est-elle absente ?</summary><p>La création du compte et sa liaison à un personnage sont deux étapes différentes. Tant qu’un administrateur n’a pas effectué la liaison, tu peux consulter le contenu du site, mais ta fiche et l’inscription aux événements nécessitent encore un personnage lié. Si la liaison a été confirmée, recharge la page.</p></details>';
    html += '<details><summary>Comment rejoindre le serveur Discord ?</summary><p>Demande le lien d’invitation à l’équipe ou à la personne qui t’a présenté Nuages Polaires. L’inscription sur le site ne rejoint pas automatiquement le serveur.</p></details>';
    html += '<details><summary>Qui contacter pour une correction de ma fiche ?</summary><p>Transmets ta demande à l’équipe sur Discord avec ton pseudo et le nom de ton personnage. Un MJ ou un administrateur peut gérer les récompenses selon ses droits ; la liaison du compte et les ajustements de statistiques relèvent d’un administrateur.</p></details>';
    html += '</section><footer class="np-steps-footer"><p>Les liens se tissent dans les récits.</p>' + button(connected ? 'Revenir au tableau de bord' : 'Retour à l’accueil', 'dashboard') + '</footer></div>';
    target.innerHTML = html;
    return true;
  };

  function closeMenus() {
    if (typeof window._closeAllNavDrops === 'function') window._closeAllNavDrops();
    if (typeof window.closeMobileDrawer === 'function') window.closeMobileDrawer();
  }

  window.openFirstSteps = function () {
    closeMenus();
    if (!window.CU) {
      window.showScreen('s-first-steps');
      return window.renderFirstSteps('public-first-steps-c');
    }
    window.showScreen('s-app');
    window.switchDropTab('premiers-pas', null, 'dd-joueurs');
    return window.renderFirstSteps('p-first-steps-c');
  };

  window.npFirstStepsGo = function (action) {
    closeMenus();
    if (action === 'guide') return window.openFirstSteps();
    if (action === 'reload') { window.location.reload(); return; }
    if (action === 'login') { window.showScreen('s-login'); return; }
    if (action === 'register') { window.showScreen('s-hrp'); return; }
    if (action === 'rpg') { if (typeof window.openRpgPrototype === 'function') window.openRpgPrototype(); return; }
    if (!window.CU) {
      if (action === 'rules') window.showScreen('s-hrp');
      else if (action === 'dashboard') window.showScreen('s-home');
      return;
    }
    if (action === 'character') { window.forceOpenOwnProfile(); return; }
    if (action === 'account') { window.openSettings('compte'); return; }
    var tabs = { rules: 'reglement', system: 'combat', events: 'evenements', serments: 'serments', dashboard: 'accueil' };
    if (!Object.prototype.hasOwnProperty.call(tabs, action)) return;
    window.showScreen('s-app');
    window.switchDropTab(tabs[action], null, action === 'events' ? '' : action === 'dashboard' ? 'dd-aventure' : 'dd-joueurs');
  };
})();

/* Reforged oaths: explicit, serializable combat rules. No prose parsing or scene checkbox. */
(function (w) {
  'use strict';
  var CATALOG = [{"name":"Arbalétrier","parent":null,"kind":"base","branches":[{"key":"A","name":"Cran de guerre","model":"armement","rule":"Charger puis choisir entre tirer, tendre davantage ou conserver le carreau. La défense défait la surtension, pas le chargement.","levels":[2,5,7,10],"power":[8,12,16,20],"strike":[16,20,24,28],"pool":[18,24,32,40],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Levier court","model":"magazine","rule":"Deux carreaux faibles chargés ensemble ; chacun exige sa propre action. Conserver la dernière munition permet une défense sans rechargement.","levels":[2,5,7,10],"power":[8,12,16,20],"strike":[15,18,22,26],"pool":[18,24,32,40],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Guetteur","parent":"Arbalétrier","kind":"evolution","branches":[{"key":"A","name":"Ligne de mire","model":"watchAttack","rule":"Réserver un tir sur un ennemi précis. Il part avant sa prochaine attaque, même au tour adverse ; l’action et le carreau sont déjà payés.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[20,26,32,40],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Fenêtre de garde","model":"watchDefense","rule":"Le tir réservé part après la première défense réellement utilisée par la cible. L’ennemi peut renoncer à défendre pour ne pas déclencher la réserve.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[20,26,32,40],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Pavoisier","parent":"Arbalétrier","kind":"evolution","branches":[{"key":"A","name":"Pavois fermé","model":"pavoisSelf","rule":"Fermer un écran fini permet de recharger sous protection ; ouvrir pour tirer détruit la protection restante.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[20,26,32,40],"pool":[24,34,46,60],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Couvert partagé","model":"pavoisAlly","rule":"Confier la protection à un allié. Le premier tir du porteur ouvre le pavois et sacrifie tout le reliquat ; le choix porte sur le moment de tirer.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[20,26,32,40],"pool":[24,34,46,60],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Pugiliste","parent":null,"kind":"base","branches":[{"key":"A","name":"Mains franches","model":"hands","rule":"Chaque frappe engage une main. Deux mains engagées interdisent de nouvelles frappes de branche ; reprendre sa garde coûte une action. Chaque main ouverte expose à deux dégâts supplémentaires.","levels":[2,5,7,10],"power":[10,14,18,22],"strike":[14,18,22,26],"pool":[18,24,32,40],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Garde de passage","model":"guard","rule":"Garder arme une réduction du prochain impact. Un impact réellement encaissé ouvre un seul coup préparé, payé séparément ; aucune riposte automatique.","levels":[2,5,7,10],"power":[10,14,18,22],"strike":[14,18,22,26],"pool":[18,24,32,40],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Lutteur","parent":"Pugiliste","kind":"evolution","branches":[{"key":"A","name":"Prise de fer","model":"gripWeapon","rule":"Un contact défendable lie les armes : ni le porteur ni la cible ne peuvent effectuer une frappe d’arme tant que la prise tient. Se dégager coûte une action.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[14,18,22,28],"pool":[20,28,36,46],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Prise de souffle","model":"gripSpell","rule":"Un contact défendable empêche les capacités payées en EM de la cible tant que la prise tient et engage les deux mains du porteur. Une action Se dégager ou une blessure extérieure rompt la prise ; assurer la prise peut lui permettre de résister à une blessure extérieure.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[14,18,22,28],"pool":[20,28,36,46],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Cestuaire","parent":"Pugiliste","kind":"evolution","branches":[{"key":"A","name":"Chambre d’impact","model":"storeHurt","rule":"Armer une chambre, subir un impact réel puis dépenser une action pour ajouter une partie de cette douleur à une frappe. La charge ne réduit jamais la blessure reçue.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[18,24,30,38],"pool":[18,26,34,44],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Soupape de garde","model":"storeGuard","rule":"Armer une chambre, subir un impact réel puis convertir une partie de la douleur en protection finie pour un allié. Il faut choisir de transmettre avant la péremption.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[18,24,30,38],"pool":[18,26,34,44],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Porte-Fléau","parent":null,"kind":"base","branches":[{"key":"A","name":"Battement long","model":"flailLong","rule":"Annoncer la victime et faire tourner le fléau. La libération n’est possible qu’au round suivant. Défendre avant de libérer casse l’élan.","levels":[2,5,7,10],"power":[12,16,20,26],"strike":[20,26,32,40],"pool":[18,24,32,40],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Reprise courte","model":"flailShort","rule":"Préparer un coup plus faible que l’on peut libérer immédiatement ; retarder jusqu’au round suivant renforce le coup, mais toute défense casse encore la rotation.","levels":[2,5,7,10],"power":[8,12,16,20],"strike":[20,26,32,40],"pool":[18,24,32,40],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Entraveur","parent":"Porte-Fléau","kind":"evolution","branches":[{"key":"A","name":"Chaîne de partage","model":"chainEnemy","rule":"Relier deux ennemis : une partie des dégâts réellement subis par l’un est transférée à l’autre, sans création de dégâts. Chacun peut rompre le lien par une action.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[14,18,22,28],"pool":[24,34,46,60],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Nœud de secours","model":"chainAlly","rule":"Relier deux alliés : répartir le premier impact entre eux évite de concentrer la blessure sur un seul corps. Le lien se rompt après ce transfert ou par une action volontaire.","levels":[10,13,16,20],"power":[10,14,18,24],"strike":[14,18,22,28],"pool":[24,34,46,60],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Pendulier","parent":"Porte-Fléau","kind":"evolution","branches":[{"key":"A","name":"Cercle ouvert","model":"swingSpread","rule":"Frapper des adversaires différents entretient le balancement ; répéter une cible remet l’élan à zéro. Le porteur peut sacrifier l’élan en garde.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[18,24,30,38],"pool":[20,28,36,46],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Cercle fermé","model":"swingFocus","rule":"La défense effectivement employée par une victime fait croître l’élan contre elle. Une nouvelle victime remet le cumul à zéro ; freiner convertit les crans en protection, sans attaque gratuite.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[18,24,30,38],"pool":[20,28,36,46],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Enchanteur","parent":null,"kind":"base","branches":[{"key":"A","name":"Rune de morsure","model":"runeAttack","rule":"Inscrire une seule rune sur un allié. Elle renforce sa prochaine attaque payée, puis disparaît. Le bénéficiaire peut d’abord utiliser une défense pour mûrir la rune une seule fois.","levels":[2,5,7,10],"power":[10,16,22,28],"strike":[8,11,14,17],"pool":[18,26,34,44],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Rune de patience","model":"runeGuard","rule":"Inscrire une protection sur un allié. Elle absorbe son prochain impact, mais disparaît s’il attaque avant d’être touché. Il choisit ainsi entre sa garde et son offensive.","levels":[2,5,7,10],"power":[10,16,22,28],"strike":[8,11,14,17],"pool":[18,26,34,44],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Tisserand","parent":"Enchanteur","kind":"evolution","branches":[{"key":"A","name":"Trame de relais","model":"relayAttack","rule":"Deux alliés partagent une rune : le premier qui attaque reçoit la charge, puis un reliquat plus faible passe à l’autre. Chaque bénéficiaire ne l’utilise qu’une fois.","levels":[10,13,16,20],"power":[18,24,32,42],"strike":[14,18,22,28],"pool":[40,54,70,90],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Trame tendue","model":"relayGuard","rule":"Deux alliés partagent une réserve de protection unique. Les impacts y puisent sans la dupliquer ; changer les bénéficiaires coûte une action et conserve le reliquat.","levels":[10,13,16,20],"power":[18,24,32,42],"strike":[14,18,22,28],"pool":[40,54,70,90],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Orfèvre","parent":"Enchanteur","kind":"evolution","branches":[{"key":"A","name":"Sertissage réversible","model":"gemChoice","rule":"Charger une gemme puis la tailler en attaque ou en protection pour un allié : la décision vient après l’investissement, chaque taille détruit l’autre possibilité.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[14,18,22,28],"pool":[18,24,30,38],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Cristal impatient","model":"gemRisk","rule":"Une gemme gagne une facette à chaque nouveau round, jusqu’à trois. Tout dégât subi par son porteur la brise ; il peut la récolter plus tôt pour un effet plus sûr.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[14,18,22,28],"pool":[18,24,30,38],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Alchimiste","parent":null,"kind":"base","branches":[{"key":"A","name":"Acide mesuré","model":"acid","rule":"Trois fioles par combat. Préparer puis lancer une dose applique deux morsures différées ; la victime peut se rincer par une action pour supprimer les morsures restantes.","levels":[2,5,7,10],"power":[20,28,36,48],"strike":[12,16,20,24],"pool":[32,46,60,80],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Fumée tenue","model":"smoke","rule":"Trois fioles par combat. Préparer puis livrer une dose forme une réserve contre les impacts physiques. Les attaques magiques traversent la fumée, mais attaquer ne la disperse pas : elle se dissipe par épuisement ou expiration.","levels":[2,5,7,10],"power":[20,28,36,48],"strike":[12,16,20,24],"pool":[32,46,60,80],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Distillateur","parent":"Alchimiste","kind":"evolution","branches":[{"key":"A","name":"Épreuve de purge","model":"extractHarm","rule":"Extraire une corrosion reforgée ou un empoisonnement natif réellement actif d’un allié, puis projeter le reliquat par une attaque payée. Une dose mère offre un départ autonome, une seule fois par combat ; aucun PV perdu n’est soigné.","levels":[10,13,16,20],"power":[14,18,24,30],"strike":[18,24,30,38],"pool":[30,42,56,72],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Épreuve de réserve","model":"extractGuard","rule":"Prélever une protection reforgée restante sur un allié, la concentrer et la réattribuer plus tard. La protection disparaît de sa première cible : aucune duplication.","levels":[10,13,16,20],"power":[14,18,24,30],"strike":[18,24,30,38],"pool":[30,42,56,72],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Essayeur","parent":"Alchimiste","kind":"evolution","branches":[{"key":"A","name":"Réactif témoin","model":"predictDefense","rule":"Annoncer esquive, parade ou blocage sur une cible. La frappe d’essai consomme la prédiction ; une lecture exacte récupère le réactif et prépare une protection, sans ignorer la défense.","levels":[10,13,16,20],"power":[16,22,28,36],"strike":[20,26,32,40],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Contre-épreuve","model":"repeatTest","rule":"Observer un adversaire. Répéter sa dernière catégorie d’attaque affaiblit sa prochaine attaque ; changer entre arme et capacité évite le réactif. Deux répétitions au plus sont enregistrées.","levels":[10,13,16,20],"power":[16,22,28,36],"strike":[20,26,32,40],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Barde","parent":null,"kind":"base","branches":[{"key":"A","name":"Mesure commune","model":"songSequence","rule":"Ouvrir la mesure protège immédiatement un allié à demi-puissance. Une attaque puis une défense réellement utilisée par cet allié permettent de clore pour une protection complète ; l’ordre inverse ne compte pas.","levels":[2,5,7,10],"power":[12,18,24,30],"strike":[8,11,14,17],"pool":[20,30,40,52],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Contrechant","model":"songCounter","rule":"Maintenir une note dirigée contre un ennemi. Sa prochaine attaque magique est affaiblie ; blesser le Barde ou employer une attaque d’arme permet de briser ou contourner la note.","levels":[2,5,7,10],"power":[12,18,24,30],"strike":[8,11,14,17],"pool":[20,30,40,52],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Carillonneur","parent":"Barde","kind":"evolution","branches":[{"key":"A","name":"Glas des armes","model":"bellsAttack","rule":"Désigner un adversaire. Chacune de ses attaques fait résonner une cloche, jusqu’à trois ; les cloches sont ensuite consumées dans une seule frappe payée.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[16,22,28,36],"pool":[28,38,50,64],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Carillon du rempart","model":"bellsDefense","rule":"Désigner un allié. Chacune de ses défenses réellement utilisées fait résonner une cloche ; les cloches deviennent une protection finie, sans soin ni action offerte.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[16,22,28,36],"pool":[28,38,50,64],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Chef de Chœur","parent":"Barde","kind":"evolution","branches":[{"key":"A","name":"Répons croisés","model":"choirAttack","rule":"Désigner deux alliés : une attaque de chacun, dans cet ordre, prépare une coda offensive pour le second. Répéter le premier chanteur ne complète pas le répons.","levels":[10,13,16,20],"power":[18,24,32,40],"strike":[16,22,28,36],"pool":[30,42,56,72],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Fugue de veille","model":"choirDefense","rule":"Désigner deux alliés : une défense réellement utilisée par chacun prépare une réserve collective. Clore coûte une action ; protéger un seul chanteur ne suffit pas.","levels":[10,13,16,20],"power":[18,24,32,40],"strike":[16,22,28,36],"pool":[30,42,56,72],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Ravageur","parent":"Sauvageon","kind":"evolution","branches":[{"key":"A","name":"Fer sans frein","model":"rage","rule":"Chaque frappe de branche ajoute un cran d’engagement : plus de dégâts infligés, mais également plus de dégâts reçus. Freiner coûte une action et sacrifie tous les crans.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[24,30,38,46],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Dette de sang","model":"blood","rule":"Le porteur paie réellement des PV avant sa frappe, sans pouvoir se tuer par ce paiement. La seconde frappe consécutive augmente la mise ; reprendre haleine annule la prochaine hausse sans rendre de PV.","levels":[10,13,16,20],"power":[12,16,20,26],"strike":[24,30,38,46],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Bastion","parent":"Croisé","kind":"evolution","branches":[{"key":"A","name":"Dette de fer","model":"debt","rule":"Mettre une part bornée du prochain impact en dette au lieu de la perdre immédiatement. Étayer réduit cette dette avec une action ; le reliquat frappe le Bastion à la fin du round suivant.","levels":[10,13,16,20],"power":[18,24,30,38],"strike":[18,24,30,38],"pool":[30,42,56,72],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Mur de relève","model":"wall","rule":"Consacrer une réserve à deux alliés. Elle absorbe leurs impacts, mais les blessures infligées au Bastion détruisent aussi une part de cette réserve ; attaquer le protecteur est la contre-mesure.","levels":[10,13,16,20],"power":[18,24,30,38],"strike":[18,24,30,38],"pool":[30,42,56,72],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Veneur","parent":"Traqueur","kind":"evolution","branches":[{"key":"A","name":"Piste vive","model":"huntLatest","rule":"Marquer deux ennemis. Une frappe n’obtient son avantage que contre celui qui a attaqué le plus récemment ; le Veneur doit suivre les événements, pas s’attacher à une victime unique.","levels":[10,13,16,20],"power":[12,18,24,32],"strike":[20,26,34,42],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Piste de secours","model":"huntRepeat","rule":"Marquer un ennemi : lorsqu’il blesse réellement un allié autre que le Veneur, une ouverture est gagnée. La prochaine frappe du Veneur contre lui la consomme. Si cet ennemi blesse le Veneur lui-même, l’ouverture disparaît.","levels":[10,13,16,20],"power":[12,18,24,32],"strike":[20,26,34,42],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Totémiste","parent":"Evocateur","kind":"evolution","branches":[{"key":"A","name":"Idole de veille","model":"totemAttack","rule":"Planter une idole destructible qui n’a aucune action autonome. Le porteur investit une action pour charger, puis une autre pour commander un seul trait défendable ; abattre l’idole détruit ses charges.","levels":[10,13,16,20],"power":[20,28,38,50],"strike":[24,30,38,46],"pool":[24,34,46,60],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Idole d’abri","model":"totemGuard","rule":"Planter une idole destructible. Le porteur choisit un allié et lui consacre les charges en protection finie ; la destruction de l’idole annule toute protection encore liée.","levels":[10,13,16,20],"power":[20,28,38,50],"strike":[24,30,38,46],"pool":[24,34,46,60],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Astronome","parent":"Arcaniste","kind":"evolution","branches":[{"key":"A","name":"Conjonction promise","model":"starChoice","rule":"Annoncer deux ennemis, attendre un round puis choisir un seul rayon. Chaque victime annoncée peut s’éclipser par une action pour quitter cette conjonction ; aucune zone indéfendable.","levels":[10,13,16,20],"power":[18,22,26,32],"strike":[78,90,106,126],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Orbite serrée","model":"starOrbit","rule":"Annoncer une victime et attendre un round. Un délai supplémentaire renforce le rayon jusqu’à trois orbites, mais la victime peut dépenser une action pour faire tomber toute la préparation.","levels":[10,13,16,20],"power":[18,22,26,32],"strike":[78,90,106,126],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]},{"name":"Prismancien","parent":"Arcaniste","kind":"evolution","branches":[{"key":"A","name":"Facettes comptées","model":"prismMagazine","rule":"Investir une réserve de trois facettes. Chaque rayon payé en action consomme une facette ; la dernière peut être sacrifiée en protection au lieu d’être tirée.","levels":[10,13,16,20],"power":[16,22,28,36],"strike":[28,34,40,46],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."},{"key":"B","name":"Lumière retenue","model":"prismReturn","rule":"Tirer un rayon défendable. Une défense réellement employée laisse un reliquat, à dépenser dans un rayon ultérieur contre une autre cible ou dans une protection ; aucun rebond gratuit.","levels":[10,13,16,20],"power":[16,22,28,36],"strike":[28,34,40,46],"pool":[24,32,42,54],"limit":"Une seule préparation de branche par porteur ; coûts non remboursés à l’interruption ; les frappes restent défendables."}]}];
  var registry = Object.create(null), originals = {}, resolving = [], serial = 0;
  CATALOG.forEach(function(e){ registry[e.name]=e; });
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function fight(){ return w._cs||{fighters:[],decl:{},round:1}; }
  function round(){ return fight().round||1; }
  function log(message){ if(w.cLog) w.cLog(message,'info'); }
  function notify(message){ if(w.notif) w.notif(message,'err'); return {ok:false,error:message}; }
  function html(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function cid(f){ if(!f) return ''; if(w.cEnsureFighterCid) return w.cEnsureFighterCid(f); if(!f._rfCid) f._rfCid='rf-'+(++serial);return f._rfCid; }
  function byCid(id){return fight().fighters.find(function(f){return cid(f)===id;});}
  function indexCid(id){return fight().fighters.findIndex(function(f){return cid(f)===id;});}
  function alive(f){return !!f&&f.pvCur>0;}
  function sameTeam(a,b){return a&&b&&(a.team!==undefined&&b.team!==undefined?a.team===b.team:a.type===b.type);}
  function decl(fi){return ((fight().decl||{})[fi]||[]);}
  function entryFor(f){
    if(!f||f.isSummon||!registry[f.classe]) return null;
    if(f._np70&&!f._rf&&fight().active)return null;
    var def=typeof w.getAllSD==='function'?w.getAllSD()[f.classe]:null;
    return def&&def.reforged?registry[f.classe]:null;
  }
  function branchKey(p,b){
    if(b&&b.key) return b.key;
    if(b&&b.combatRules&&b.combatRules.key) return b.combatRules.key;
    if(p&&/^[AB]$/.test(p.branch||'')) return p.branch;
    if(b&&/^Branche B/.test(b.nom||'')) return 'B';
    return b?'A':null;
  }
  function info(fi){
    var f=fight().fighters[fi],e=entryFor(f);if(!e)return null;
    var p=typeof w.cGetFighterPlayer==='function'?w.cGetFighterPlayer(fi):null;
    var bundle=p&&typeof w.getPlayerSermentBundle==='function'?w.getPlayerSermentBundle(p):null;
    var key=f._rf&&f._rf.key||branchKey(p,bundle&&bundle.branch),b=e.branches.find(function(v){return v.key===key;});
    var level=Number(p&&p.level||f.level||1),tier=b?b.levels.filter(function(v){return v<=level;}).length-1:-1;
    return {fi:fi,f:f,entry:e,branch:b,key:key,model:b&&b.model,level:level,tier:tier,power:tier>=0?b.power[tier]:0,strike:tier>=0?b.strike[tier]+level:0,pool:tier>=0?b.pool[tier]:0};
  }
  function fresh(c){return {version:2,name:c.entry.name,key:c.key,stage:'idle',ammo:6,loaded:0,tension:0,hands:0,charges:0,pool:0,readyRound:0,expires:0,targets:[],lastTarget:'',lastKind:'',seen:[],usedRound:{},vials:3,facets:0,sequence:0,debt:0,records:[]};}
  function saved(fi){var c=info(fi);if(!c)return null;if(!c.f._rf)c.f._rf=fresh(c);if(!c.f._rf.key&&c.key)c.f._rf.key=c.key;return c.f._rf;}
  function effects(f){if(!f)return [];if(!f._rfEffects)f._rfEffects=[];return f._rfEffects;}
  function activeEffects(f){return effects(f).filter(function(e){return !e.spent&&(!e.expires||e.expires>=round())&&(e.kind==='acid'||!e.owner||alive(byCid(e.owner)));});}
  function clearOwned(owner,kind){fight().fighters.forEach(function(f){effects(f).forEach(function(e){if(e.owner===owner&&(!kind||e.kind===kind))e.spent=true;});});}
  function putEffect(f,e){if(!f)return;effects(f).filter(function(x){return x.owner===e.owner&&x.kind===e.kind;}).forEach(function(x){x.spent=true;});effects(f).push(Object.assign({expires:round()+2},e));}
  function effectTarget(p){return fight().fighters[p.target];}
  function reset(s){s.stage='idle';s.expires=0;s.targets=[];s.sequence=0;s.seen=[];s.charges=0;s.pool=0;s.facets=0;s.readyRound=0;s.resilient=false;s.tightened=false;}
  function setup(s,stage,params,duration){s.stage=stage;s.targets=[params.target,params.second].filter(Number.isInteger).map(function(i){return cid(fight().fighters[i]);});s.readyRound=round();s.expires=round()+(duration===undefined?2:duration);s.sequence=0;s.seen=[];s.sustained=false;}
  function isAttack(a){if(a&&a.np70&&(!a.np70.op||a.np70.op.damage===undefined))return false;return !!a&&!a.rf&&((a.kind==='attack')||['frappe','pugilat','frappe_dechainees'].indexOf(a.action)>=0);}
  function category(a){return a._rfCategory||((a.emCost||0)>0||a.action==='capacite'?'magic':'weapon');}
  function attackCategory(c){return ['Arbalétrier','Guetteur','Pavoisier','Pugiliste','Lutteur','Cestuaire','Porte-Fléau','Entraveur','Pendulier','Ravageur','Veneur'].indexOf(c.entry.name)>=0?'weapon':'magic';}
  function operationBlocked(c,op){var ee=activeEffects(c.f);if(ee.some(function(e){return e.kind==='grip'&&(e.mode==='magic'&&op.em>0||e.mode==='weapon'&&op.offensive&&op.category==='weapon');}))return 'La prise empêche cette opération ; se dégager d’abord.';return '';}
  function firstDefense(fi,a){var ds=decl(fi).filter(function(d){return ['esquive','bloquer','parer'].indexOf(d.action)>=0;});var used=(fight()._usedDefs||{})[fi+'_def']||0;return a&&a.undefendable?null:ds[used]||null;}
  function expiring(s){return s.expires&&round()>s.expires;}
  function projected(fi){var c=info(fi),s=clone(saved(fi));if(!c||!s)return s;decl(fi).forEach(function(a){if(a.rf){var op=operations(c,s).find(function(o){return o.id===a.rf.id;});if(op&&!op.reason)op.run(s,a.rf.params,true);}else if(['parer','bloquer','esquive'].indexOf(a.action)>=0){if(['armement','flailLong','flailShort'].indexOf(c.model)>=0){s.tension=0;if(c.model.indexOf('flail')===0)reset(s);}}});return s;}
  function hit(c,target,value,extra){
    var forced=typeof w.cGetForcedTargetInfo==='function'&&w.cGetForcedTargetInfo(c.fi);if(forced&&alive(forced.source)){var forcedIndex=fight().fighters.indexOf(forced.source);if(forcedIndex>=0)target=forcedIndex;}
    if(!alive(effectTarget({target:target}))) return {damage:0,defended:false};
    var victim=fight().fighters[target],redirected=typeof w.cFindAutoInterpose==='function'&&w.cFindAutoInterpose(victim),observed=redirected||victim,observedIndex=fight().fighters.indexOf(observed),before=observed.pvCur,defense=firstDefense(observedIndex,extra),used=(fight()._usedDefs||{})[observedIndex+'_def']||0;
    resolveAttack(c.f,c.fi,Object.assign({action:'capacite',kind:'attack',label:c.branch?c.branch.name:'Tir du serment',value:Math.max(0,value),target:target,emCost:0,_rfHit:true,_rfCategory:attackCategory(c)},extra||{}));
    return {damage:Math.max(0,before-observed.pvCur),defended:((fight()._usedDefs||{})[observedIndex+'_def']||0)>used,defense:defense,target:observed};
  }
  function addProtection(c,target,amount,opts){putEffect(target,Object.assign({kind:'shield',owner:cid(c.f),amount:amount,expires:round()+2},opts||{}));}
  function addPower(c,target,amount,opts){putEffect(target,Object.assign({kind:'power',owner:cid(c.f),amount:amount,expires:round()+2},opts||{}));}
  function extractable(target,harm){
    var effect=activeEffects(target).find(function(e){return e.kind===(harm?'acid':'shield')&&e.amount>0;});
    if(effect)return {amount:effect.amount*(effect.ticks||1),consume:function(){effect.spent=true;}};
    var poison=harm&&target&&(target.statuts||[]).find(function(st){return st.id==='empoisonne'&&st.tours>0;});
    if(poison)return {amount:Math.max(1,Math.ceil(target.pvMax*.05))*poison.tours,consume:function(){target.statuts=target.statuts.filter(function(st){return st!==poison;});}};
    return null;
  }
  function operations(c,s){
    if(!c)return [];
    if(c.tier<0){
      if(['Arbalétrier','Guetteur','Pavoisier'].indexOf(c.entry.name)<0)return [];
      var equipmentDamage=((typeof w.getAllSD==='function'&&w.getAllSD()[c.entry.name]||{}).dmg||20)+c.level;
      return [{id:'load',label:'Armer l’arbalète',actions:1,ep:4,em:0,target:'none',rule:'1 action, 4 EP. Charge un carreau parmi les 6 du combat.',reason:s.loaded?'Un carreau est déjà chargé.':s.ammo<=0?'Aucun carreau restant.':'',run:function(x){x.loaded=1;}},{id:'shoot',label:'Tirer le carreau',actions:1,ep:4,em:0,target:'enemy',offensive:true,category:'weapon',rule:'1 action, 4 EP. '+equipmentDamage+' dégâts défendables ; consomme le carreau chargé.',reason:s.loaded<=0?'Charger avant de tirer.':'',run:function(x,a,preview){x.loaded--;x.ammo--;if(!preview)hit(c,a.target,equipmentDamage);}}];
    }
    if(!c.branch)return [];
    var ops=[],m=c.model,p=c.power,d=c.strike,q=c.pool,t=c.tier,owner=cid(c.f);
    function add(id,label,ep,em,rule,run,extra){var o=Object.assign({id:id,label:label,actions:1,ep:ep,em:em,rule:rule,target:'none',run:run},extra||{});if(o.unlock===undefined||t>=o.unlock)ops.push(o);return o;}
    function idle(){return s.stage!=='idle'?'Une préparation est déjà engagée.':'';}
    function ready(stage){return s.stage!==stage?'Effectuer la préparation correspondante avant cette opération.':'';}
    function prepare(id,label,ep,em,stage,target,rule,extra){return add(id,label,ep,em,rule,function(x,a){setup(x,stage,a);},Object.assign({target:target,reason:idle()},extra||{}));}
    function cancel(){if(s.stage!=='idle')add('cancel','Abandonner la préparation',0,0,'1 action ; détruit la préparation sans rendre ses coûts.',function(x,a,preview){if(!preview){if(['rune','link','grip','closed','woven','wall','song','counter','totem'].indexOf(x.stage)>=0)clearOwned(owner);killDevice(c);}reset(x);});}
    function load(cap,ep){add('load',cap>1?'Charger deux carreaux':'Armer l’arbalète',ep,0,'1 action, '+ep+' EP. Charge '+cap+' carreau(x), parmi les 6 du combat. Aucun carreau créé.',function(x){x.loaded=Math.min(cap,x.ammo);x.tension=0;},{reason:s.loaded>=(t>=2?cap:1)?'Arbalète déjà chargée.':s.ammo<=0?'Aucun carreau restant.':''});}
    function shoot(base){add('shoot','Tirer un carreau',4,0,'1 action, 4 EP. '+base+' dégâts, un carreau consommé ; tir défendable.',function(x,a,preview){x.loaded--;x.ammo--;var bonus=x.tension*p;x.tension=0;if(!preview)hit(c,a.target,base+bonus);},{target:'enemy',reason:s.loaded<=0?'Charger un carreau avant de tirer.':''});}
    switch(m){
      case 'armement':
        load(1,6);shoot(d+4);
        add('tension','Surarmer le cran',4,0,'1 action, 4 EP. Prochain tir +'+p+' dégâts. Une défense annule cette surtension. Un cran maximum.',function(x){x.tension=1;},{unlock:1,reason:s.loaded<=0?'Charger avant de tendre.':s.tension?'Cran déjà tendu.':''});break;
      case 'magazine':load(2,6);shoot(d-1);break;
      case 'watchAttack':case 'watchDefense':
        load(1,6);
        add('watch','Réserver le tir',4,4,'1 action, 4 EP, 4 EM et 1 carreau réservés. '+d+' dégâts sur le prochain '+(m==='watchAttack'?'assaut':'geste défensif')+' de la cible, avant la fin du round suivant. Aucun tir si elle ne remplit pas la condition.',function(x,a){x.loaded--;x.ammo--;setup(x,'watch',a,1);x.charges=1;},{target:'enemy',reason:s.loaded<=0?'Charger le carreau à réserver.':idle()});break;
      case 'pavoisSelf':case 'pavoisAlly':
        load(1,6);
        add('close','Fermer le pavois',2,4,'1 action, 2 EP, 4 EM. Réserve de '+q+' protection ; le premier tir la détruit.',function(x,a,preview){setup(x,'closed',a);x.pool=q;if(!preview)addProtection(c,m==='pavoisSelf'?c.f:effectTarget(a),q,{pavois:true});},{target:m==='pavoisAlly'?'ally':'none',reason:idle()});
        add('shoot','Ouvrir et tirer',4,0,'1 action, 4 EP. Sacrifie le pavois restant et tire pour '+(d+2)+' dégâts.',function(x,a,preview){x.loaded--;x.ammo--;if(!preview){clearOwned(owner,'shield');hit(c,a.target,d+2);}reset(x);},{target:'enemy',reason:s.loaded<=0?'Charger un carreau avant de tirer.':''});break;
      case 'hands':
        add('punch','Engager une main',5,2,'1 action, 5 EP, 2 EM. '+d+' dégâts. Chaque main engagée ajoute 2 aux dégâts reçus, maximum 2 mains.',function(x,a,preview){x.hands++;if(!preview)hit(c,a.target,d);},{target:'enemy',reason:s.hands>=2?'Les deux mains sont engagées. Reprendre la garde.':''});
        add('guard','Reprendre les deux mains',2,0,'1 action, 2 EP. Libère les deux mains et supprime leur exposition.',function(x){x.hands=0;},{reason:s.hands===0?'Les mains sont déjà libres.':''});break;
      case 'guard':
        add('guard','Armer la garde',2,3,'1 action, 2 EP, 3 EM. Absorbe '+p+' sur le prochain impact. Une blessure résiduelle ouvre le coup préparé.',function(x,a,preview){setup(x,'guard',a);if(!preview)addProtection(c,c.f,p,{opensGuard:true});},{reason:idle()});
        add('punch','Coup préparé',6,0,'1 action, 6 EP. '+(d+p)+' dégâts ; exige une blessure réellement subie sous garde.',function(x,a,preview){reset(x);if(!preview)hit(c,a.target,d+p);},{target:'enemy',reason:ready('opening')});break;
      case 'gripWeapon':case 'gripSpell':
        add('grip','Établir la prise',4,4,'1 action, 4 EP, 4 EM. Contact défendable sans dégâts. Bloque '+(m==='gripWeapon'?'les frappes d’arme':'les capacités en EM')+' de la victime ; le porteur ne peut plus frapper avec ses mains. Une action Se dégager ou une blessure extérieure rompt la prise.',function(x,a,preview){setup(x,'grip',a,1);if(!preview){var ti=contactTarget(c,a.target);if(contactDefended(ti)){reset(x);return;}x.targets=[cid(fight().fighters[ti])];putEffect(fight().fighters[ti],{kind:'grip',owner:owner,mode:m==='gripWeapon'?'weapon':'magic',expires:round()+1});}},{target:'enemy',reason:idle()});
        add('release','Relâcher la prise',0,0,'1 action. Libère les deux combattants.',function(x,a,preview){if(!preview)clearOwned(owner,'grip');reset(x);},{reason:ready('grip')});break;
      case 'storeHurt':case 'storeGuard':
        add('arm','Ouvrir la chambre',2,4,'1 action, 2 EP, 4 EM. Stocke les dégâts du prochain impact réellement subi, maximum '+q+', sans les empêcher. Expire après le prochain round.',function(x,a){setup(x,'chamber',a,1);},{reason:idle()});
        add('release',m==='storeHurt'?'Restituer l’impact':'Ouvrir la soupape',m==='storeHurt'?6:0,0,'1 action. '+(m==='storeHurt'?'6 EP ; frappe '+d+' + charge.':'Protection égale à la charge sur un allié.')+' Consomme toute la charge.',function(x,a,preview){var value=x.pool;reset(x);if(!preview){if(m==='storeHurt')hit(c,a.target,d+value);else addProtection(c,effectTarget(a),value);}},{target:m==='storeHurt'?'enemy':'ally',reason:s.stage!=='charged'||s.pool<=0?'Aucun impact stocké.':''});break;
      case 'flailLong':case 'flailShort':
        prepare('wind','Amorcer la rotation',4,3,'rotation','enemy','1 action, 4 EP, 3 EM. Annonce une victime. Une défense brise la rotation ; le fléau reste engagé jusqu’à sa libération.');
        add('release','Libérer le fléau',6,0,'1 action, 6 EP. '+(m==='flailLong'?d+p:d)+' dégâts'+(m==='flailShort'?' ; +'+p+' si un round a passé.':', uniquement à partir du round suivant.')+' Cible annoncée uniquement.',function(x,a,preview){var target=indexCid(x.targets[0]),bonus=m==='flailLong'||round()>x.readyRound?p:0;reset(x);if(!preview)hit(c,target,d+bonus);},{reason:s.stage!=='rotation'?'Amorcer une rotation.':m==='flailLong'&&round()<=s.readyRound?'Attendre le round suivant.':''});
        add('retarget','Réorienter la rotation',2,1,'1 action, 2 EP, 1 EM. Change la cible et recommence le délai.',function(x,a){x.targets=[cid(effectTarget(a))];x.readyRound=round();},{target:'enemy',unlock:1,reason:ready('rotation')});break;
      case 'chainEnemy':case 'chainAlly':
        add('link','Fermer les maillons',3,5,'1 action, 3 EP, 5 EM. Lie deux '+(m==='chainEnemy'?'ennemis':'alliés')+' différents. Transfère '+(m==='chainEnemy'?25:50)+' % des dégâts résiduels de l’un vers l’autre, sans duplication'+(m==='chainAlly'?' ; premier impact seulement.':'.')+' Une action Rompre le lien suffit.',function(x,a,preview){setup(x,'link',a);if(!preview)x.targets.forEach(function(id,i){putEffect(byCid(id),{kind:'chain',owner:owner,other:x.targets[1-i],ratio:m==='chainEnemy'?.25:.5,once:m==='chainAlly',expires:round()+2});});},{target:m==='chainEnemy'?'enemies':'allies',reason:idle()});break;
      case 'swingSpread':case 'swingFocus':
        add('swing','Entretenir le cercle',6,3,'1 action, 6 EP, 3 EM. '+d+' + '+(2+t)+' par cran d’élan, maximum 3. '+(m==='swingSpread'?'Changer de cible gagne un cran ; répéter remet à zéro.':'Une défense effectivement utilisée par la même cible gagne un cran ; changer de cible remet à zéro.'),function(x,a,preview){var target=cid(effectTarget(a)),same=target===x.lastTarget;if(m==='swingSpread')x.charges=x.lastTarget&&!same?Math.min(3,x.charges+1):0;else if(!same)x.charges=0;x.lastTarget=target;x.stage='swing';if(!preview){var result=hit(c,a.target,d+x.charges*(2+t));if(m==='swingFocus'&&result.defended)x.charges=Math.min(3,x.charges+1);}},{target:'enemy'});
        add('brake','Freiner en garde',2,0,'1 action, 2 EP. Sacrifie les crans et obtient '+(3+t)+' protection par cran.',function(x,a,preview){var amount=x.charges*(3+t);reset(x);x.lastTarget='';if(!preview)addProtection(c,c.f,amount);},{reason:s.charges<=0?'Aucun élan à convertir.':''});break;
      case 'runeAttack':case 'runeGuard':
        add('inscribe','Inscrire la rune',0,5,'1 action, 5 EM. '+(m==='runeAttack'?'Prochaine attaque du bénéficiaire +'+p+' ; une défense utilisée avant la frappe ajoute encore '+(2+t)+' une seule fois.':'Prochain impact réduit de '+q+' ; attaquer avant l’impact détruit la rune.')+' Une seule rune personnelle active.',function(x,a,preview){setup(x,'rune',a);if(!preview){clearOwned(owner);if(m==='runeAttack')addPower(c,effectTarget(a),p,{mature:2+t});else addProtection(c,effectTarget(a),q,{breakOnAttack:true});}},{target:'ally',reason:idle()});break;
      case 'relayAttack':case 'relayGuard':
        add('weave','Tisser les deux liens',0,7,'1 action, 7 EM. '+(m==='relayAttack'?'Premier attaquant +'+p+' ; puis le second bénéficie de '+Math.ceil(p/2)+'. Chaque charge disparaît après une attaque.':'Réserve UNIQUE de '+q+' protection partagée par les deux alliés.')+' Deux bénéficiaires différents.',function(x,a,preview){setup(x,'woven',a);x.pool=q;x.sequence=0;if(!preview)clearOwned(owner);},{target:'allies',reason:idle()});
        add('retarget','Reprendre le tissage',0,2,'1 action, 2 EM. Change les bénéficiaires sans recréer la réserve ni les charges.',function(x,a){x.targets=[cid(effectTarget(a)),cid(fight().fighters[a.second])];},{target:'allies',unlock:1,reason:ready('woven')});break;
      case 'gemChoice':case 'gemRisk':
        add('grow','Sertir la gemme',0,6,'1 action, 6 EM. Prépare une facette'+(m==='gemRisk'?' ; une facette de plus à chaque round, maximum 3. Toute blessure du porteur brise la gemme.':'.')+' Attaque et protection sont ensuite des choix exclusifs.',function(x,a){setup(x,'gem',a,3);x.facets=1;},{reason:idle()});
        add('attack','Tailler la morsure',0,2,'1 action, 2 EM. Prochaine attaque alliée +'+p+' par facette ; détruit la gemme.',function(x,a,preview){var value=p*x.facets;reset(x);if(!preview)addPower(c,effectTarget(a),value);},{target:'ally',reason:ready('gem')});
        add('protect','Tailler le rempart',0,2,'1 action, 2 EM. Protection alliée de '+q+' par facette ; détruit la gemme.',function(x,a,preview){var value=q*x.facets;reset(x);if(!preview)addProtection(c,effectTarget(a),value);},{target:'ally',reason:ready('gem')});break;
      case 'acid':case 'smoke':
        add('brew','Préparer une fiole',0,3,'1 action, 3 EM et 1 des 3 fioles du combat. Une dose préparée à la fois.',function(x,a){x.vials--;setup(x,'dose',a,3);},{reason:s.vials<=0?'Les trois fioles ont été dépensées.':idle()});
        add('throw','Employer la dose',2,2,'1 action, 2 EP, 2 EM. '+(m==='acid'?'Contact défendable sans dégâts immédiats ; '+Math.ceil(p/2)+' corrosion en fin de round pendant 2 rounds. Se rincer coûte une action et annule le restant.':'Réserve de '+q+' contre les impacts physiques uniquement ; les attaques magiques la traversent. Attaquer ne dissipe pas cette fumée.')+' Consomme la dose.',function(x,a,preview){reset(x);if(!preview){if(m==='acid'){var ti=contactTarget(c,a.target);if(!contactDefended(ti))putEffect(fight().fighters[ti],{kind:'acid',owner:owner,amount:Math.ceil(p/2),ticks:2,expires:round()+2});}else addProtection(c,effectTarget(a),q,{physicalOnly:true,smoke:true});}},{target:m==='acid'?'enemy':'ally',reason:ready('dose')});break;
      case 'extractHarm':case 'extractGuard':
        add('extract','Prélever le reliquat',0,4,'1 action, 4 EM. Retire une '+(m==='extractHarm'?'corrosion reforgée ou empoisonnement natif':'protection reforgée')+' réellement active d’un allié et stocke sa valeur restante (maximum '+q+'). Rien n’est créé si aucun effet compatible n’existe.',function(x,a,preview){var available=extractable(effectTarget(a),m==='extractHarm');if(!available)return;setup(x,'distilled',a,3);x.pool=Math.min(q,available.amount);if(!preview)available.consume();},{target:'ally',reason:idle(),validate:function(a){return extractable(effectTarget(a),m==='extractHarm')?'':'Aucun reliquat compatible sur cette cible.';}});
        add('release',m==='extractHarm'?'Projeter le concentré':'Réattribuer le reliquat',2,0,'1 action, 2 EP. '+(m==='extractHarm'?'Frappe défendable égale à la valeur extraite.':'Protection égale à la valeur extraite.')+' Consomme le flacon.',function(x,a,preview){var value=x.pool;reset(x);if(!preview){if(m==='extractHarm')hit(c,a.target,value);else addProtection(c,effectTarget(a),value);}},{target:m==='extractHarm'?'enemy':'ally',reason:ready('distilled')});break;
      case 'predictDefense':
        add('predict','Annoncer l’hypothèse',0,3,'1 action, 3 EM. Annonce une défense précise et une victime ; une hypothèse active à la fois.',function(x,a){setup(x,'prediction',a);x.prediction=a.choice||'esquive';},{target:'enemy',choice:['esquive','parer','bloquer'],reason:idle()});
        add('test','Frappe d’essai',4,2,'1 action, 4 EP, 2 EM. '+d+' dégâts défendables. Si la défense annoncée est effectivement utilisée, gagne '+p+' protection. Aucun dégât ne contourne la défense.',function(x,a,preview){var ti=indexCid(x.targets[0]),expected=x.prediction,def=firstDefense(ti);reset(x);if(!preview){var result=hit(c,ti,d);if(result.defended&&result.defense&&result.defense.action===expected)addProtection(c,c.f,p);}},{reason:ready('prediction')});break;
      case 'repeatTest':
        add('observe','Poser la contre-épreuve',0,5,'1 action, 5 EM. Observe une victime pendant 2 rounds. Une attaque répétant sa précédente catégorie perd '+p+' dégâts. Maximum 2 répétitions affaiblies ; changer arme/magie évite l’effet.',function(x,a){setup(x,'observing',a);x.charges=2;x.lastKind='';},{target:'enemy',reason:idle()});break;
      case 'songSequence':
        add('sing','Ouvrir la mesure',0,4,'1 action, 4 EM. Protection immédiate de '+Math.ceil(q/2)+'. L’allié doit ensuite attaquer puis employer une défense, dans cet ordre, en 2 rounds.',function(x,a,preview){setup(x,'song',a);if(!preview)addProtection(c,effectTarget(a),Math.ceil(q/2));},{target:'ally',reason:idle()});
        add('close','Clore la mesure',0,2,'1 action, 2 EM. Protection de '+q+' sur le bénéficiaire ; exige attaque puis défense utilisées.',function(x,a,preview){var target=byCid(x.targets[0]);reset(x);if(!preview)addProtection(c,target,q);},{reason:s.stage!=='song'||s.sequence<2?'Mesure incomplète : attaque puis défense.':''});break;
      case 'songCounter':
        add('sing','Tenir le contrechant',0,5,'1 action, 5 EM. La prochaine attaque magique de la victime perd '+p+' dégâts. Une blessure du Barde interrompt le chant. Expire après le round suivant.',function(x,a){setup(x,'counter',a,1);},{target:'enemy',reason:idle()});break;
      case 'bellsAttack':case 'bellsDefense':
        prepare('listen','Accorder les cloches',0,4,'bells',m==='bellsAttack'?'enemy':'ally','1 action, 4 EM. Chaque '+(m==='bellsAttack'?'attaque de la victime':'défense utilisée du bénéficiaire')+' ajoute une cloche, maximum 3, pendant 2 rounds.');
        add('release',m==='bellsAttack'?'Sonner le glas':'Sonner le rempart',m==='bellsAttack'?4:0,2,'1 action, '+(m==='bellsAttack'?'4 EP et ':'')+'2 EM. '+(m==='bellsAttack'?'Frappe défendable '+d+' + '+p+' par cloche.':'Protection de '+p+' par cloche.')+' Consomme toutes les cloches.',function(x,a,preview){var n=x.charges;reset(x);if(!preview){if(m==='bellsAttack')hit(c,a.target,d+p*n);else addProtection(c,effectTarget(a),p*n);}},{target:m==='bellsAttack'?'enemy':'ally',reason:s.stage!=='bells'||s.charges<1?'Aucune cloche n’a résonné.':''});break;
      case 'choirAttack':case 'choirDefense':
        prepare('conduct','Distribuer les voix',0,6,'choir','allies','1 action, 6 EM. '+(m==='choirAttack'?'Le premier allié puis le second doivent attaquer.':'Les deux alliés doivent employer une défense chacun.')+' Deux voix distinctes ; délai de 2 rounds.');
        add('close','Clore la fugue',0,2,'1 action, 2 EM. '+(m==='choirAttack'?'Prochaine attaque du second chanteur +'+(p*2)+'.':'Protection de '+q+' pour chacun des deux chanteurs.')+' Les deux voix doivent être complètes.',function(x,a,preview){var targets=x.targets.slice();reset(x);if(!preview){if(m==='choirAttack')addPower(c,byCid(targets[1]),p*2);else targets.forEach(function(id){addProtection(c,byCid(id),q);});}},{reason:s.stage!=='choir'||s.sequence<2?'Les deux voix ne sont pas encore accomplies.':''});break;
      case 'rage':case 'blood':
        add('strike',m==='rage'?'Engager le fer':'Payer la mise de sang',6,3,'1 action, 6 EP, 3 EM. '+(m==='rage'?d+' + '+(3+t)+' par cran (maximum 3), mais chaque cran ajoute 2 aux dégâts reçus.':d+' + mise payée en PV ; mise '+(4+t)+' par frappe consécutive, maximum 3 mises. Ne peut pas payer jusqu’à 0 PV.'),function(x,a,preview){x.charges=Math.min(3,x.charges+1);var bonus=m==='rage'?x.charges*(3+t):x.charges*(4+t);x.stage='rage';if(preview&&m==='blood')x.pvCost=(x.pvCost||0)+bonus;if(!preview){if(m==='blood')c.f.pvCur-=bonus;hit(c,a.target,d+bonus);}},{target:'enemy',reason:m==='blood'&&c.f.pvCur-(s.pvCost||0)<=Math.min(3,s.charges+1)*(4+t)?'PV insuffisants pour survivre à la mise.':''});
        add('brake','Reprendre haleine',2,0,'1 action, 2 EP. Annule tous les crans ; aucun PV remboursé.',function(x){reset(x);},{reason:s.charges<=0?'Aucun cran engagé.':''});break;
      case 'debt':
        add('brace','Prendre la dette',2,4,'1 action, 2 EP, 4 EM. Reporte au maximum '+q+' dégâts du prochain impact, sans soin. Le reliquat de dette est payé à la fin du round suivant.',function(x,a){setup(x,'debt',a,2);x.pool=q;x.debtDue=round()+1;},{reason:s.debt>0?'Régler la dette courante avant de recommencer.':idle()});
        add('pay','Étayer la dette',6,0,'1 action, 6 EP. Réduit la dette de '+p+'. Les dégâts différés ne peuvent pas être transférés ou absorbés.',function(x){x.debt=Math.max(0,x.debt-p);},{reason:s.debt<=0?'Aucune dette à étayer.':''});break;
      case 'wall':
        add('raise','Consacrer le mur',2,6,'1 action, 2 EP, 6 EM. Réserve unique de '+(q*2)+' protection pour deux alliés autres que le Bastion. Les blessures du Bastion détruisent autant de réserve supplémentaire.',function(x,a){setup(x,'wall',a);x.pool=q*2;},{target:'allies',excludeSelf:true,reason:idle()});break;
      case 'huntLatest':case 'huntRepeat':
        add('mark','Ouvrir la piste',0,4,'1 action, 4 EM. '+(m==='huntLatest'?'Marque deux ennemis. Le bonus ne vaut que contre le dernier qui a attaqué.':'Marque un ennemi ; sa blessure réelle à un allié autre que le Veneur ouvre la piste. S’il blesse le Veneur, l’ouverture est perdue.')+' Marque pendant 3 rounds.',function(x,a){setup(x,'hunt',a,3);x.lastTarget='';x.lastKind='';x.charges=0;},{target:m==='huntLatest'?'enemies':'enemy',reason:idle()});
        add('strike','Frapper dans la piste',6,2,'1 action, 6 EP, 2 EM. '+d+' dégâts ; +'+p+' '+(m==='huntLatest'?'contre la dernière victime active.':'si la victime a blessé un autre allié, puis ouverture consommée.'),function(x,a,preview){var bonus=m==='huntLatest'?(cid(effectTarget(a))===x.lastTarget?p:0):(x.charges?p:0);if(m==='huntRepeat')x.charges=0;if(!preview)hit(c,a.target,d+bonus);},{target:'enemy',reason:ready('hunt'),validate:function(a){return s.targets.indexOf(cid(effectTarget(a)))>=0?'':'La victime n’appartient pas à cette piste.';}});break;
      case 'totemAttack':case 'totemGuard':
        add('plant','Planter l’idole',2,6,'1 action, 2 EP, 6 EM. Idole de '+q+' PV, 0 action et 0 attaque autonome. Une seule idole par combat ; sa destruction annule ses charges et protections.',function(x,a,preview){setup(x,'totem',a,0);x.expires=0;x.planted=true;x.pool=q;x.charges=1;if(!preview)createDevice(c,x);},{reason:s.planted?'Une seule idole peut être créée par combat.':''});
        add('charge','Charger l’idole',0,4,'1 action, 4 EM. Ajoute deux charges, maximum '+(2+(t>=2?1:0))+'. L’idole doit être intacte.',function(x){x.charges=Math.min(2+(t>=2?1:0),x.charges+2);},{reason:s.stage!=='totem'?'Idole absente ou détruite.':s.charges>=2+(t>=2?1:0)?'Réserve pleine.':''});
        add('command',m==='totemAttack'?'Commander le trait':'Commander l’abri',0,1,'1 action, 1 EM et 1 charge. '+(m==='totemAttack'?'Un trait défendable de '+d+' dégâts.':'Une protection de '+p+' sur un allié ; disparaît si l’idole est détruite.'),function(x,a,preview){x.charges--;if(!preview){if(m==='totemAttack')hit(c,a.target,d);else addProtection(c,effectTarget(a),p,{device:x.device});}},{target:m==='totemAttack'?'enemy':'ally',reason:s.stage!=='totem'||s.charges<=0?'Une idole intacte et chargée est requise.':''});break;
      case 'starChoice':case 'starOrbit':
        add('align','Annoncer la conjonction',0,6,'1 action, 6 EM. '+(m==='starChoice'?'Annonce deux victimes ; choisit ensuite un seul rayon.':'Annonce une victime ; chaque round ajoute une orbite, maximum 3.')+' Un round de délai. Les victimes disposent d’Éclipser (1 action, 4 EP) pour se retirer.',function(x,a){setup(x,'stars',a,3);x.facets=1;},{target:m==='starChoice'?'enemies':'enemy',reason:idle()});
        add('release','Résoudre un rayon',0,6,'1 action, 6 EM. '+(d+p)+' dégâts'+(m==='starOrbit'?' + '+p+' par orbite au-delà de la première.':'.')+' Une seule victime annoncée, encore présente ; rayon entièrement défendable.',function(x,a,preview){var value=d+p+(m==='starOrbit'?p*(x.facets-1):0);reset(x);if(!preview)hit(c,a.target,value);},{target:'enemy',reason:s.stage!=='stars'?'Aucune conjonction.':round()<=s.readyRound?'Attendre le round suivant.':'',validate:function(a){return s.targets.indexOf(cid(effectTarget(a)))>=0?'':'Cette victime s’est retirée ou n’était pas annoncée.';}});break;
      case 'prismMagazine':
        add('charge','Charger les trois facettes',0,12,'1 action, 12 EM. Trois facettes. Chaque rayon ou protection en consomme une ; aucun rechargement tant qu’il en reste.',function(x,a){setup(x,'prism',a,4);x.charges=3;},{reason:idle()});
        add('shoot','Tailler un rayon',0,1,'1 action, 1 EM et une facette. '+d+' dégâts défendables.',function(x,a,preview){x.charges--;if(!preview)hit(c,a.target,d);if(!x.charges)reset(x);},{target:'enemy',reason:s.charges<=0?'Aucune facette disponible.':''});
        add('protect','Briser une facette en abri',0,1,'1 action, 1 EM et une facette. Protection de '+p+' sur le porteur.',function(x,a,preview){x.charges--;if(!preview)addProtection(c,c.f,p);if(!x.charges)reset(x);},{reason:s.charges<=0?'Aucune facette disponible.':''});break;
      case 'prismReturn':
        add('shoot','Émettre le rayon',0,7,'1 action, 7 EM. '+d+' dégâts défendables. Si la victime utilise une défense, conserve un reliquat de '+p+' ; un seul reliquat, non cumulable.',function(x,a,preview){if(!preview){var result=hit(c,a.target,d);if(result.defended){setup(x,'residual',a);x.pool=p;x.lastTarget=cid(effectTarget(a));}}},{target:'enemy'});
        add('release','Réemployer le reliquat',0,2,'1 action, 2 EM. '+d+' + reliquat en dégâts sur une autre victime, puis reliquat détruit.',function(x,a,preview){var value=d+x.pool;reset(x);if(!preview)hit(c,a.target,value);},{target:'enemy',reason:ready('residual'),validate:function(a){return cid(effectTarget(a))===s.lastTarget?'Choisir une autre victime que celle du rayon précédent.':'';}});
        add('protect','Recueillir en abri',0,1,'1 action, 1 EM. Convertit le reliquat en protection personnelle, sans soin.',function(x,a,preview){var value=x.pool;reset(x);if(!preview)addProtection(c,c.f,value);},{reason:ready('residual')});break;
    }
    if(['gripWeapon','gripSpell'].indexOf(m)>=0){
      add('braceGrip','Assurer la prise',4,2,'1 action, 4 EP, 2 EM. La prise résiste à UNE blessure extérieure ; une action Se dégager la rompt toujours. Protection personnelle de '+Math.ceil(p/2)+'.',function(x,a,preview){x.resilient=true;if(!preview)addProtection(c,c.f,Math.ceil(p/2));},{unlock:1,reason:s.stage!=='grip'?'Aucune prise tenue.':s.resilient?'Prise déjà assurée.':''});
      add('releaseGuard','Décrocher en garde',2,2,'1 action, 2 EP, 2 EM. Relâche la prise et obtient '+p+' protection. Le porteur retrouve ses mains mais abandonne le contrôle.',function(x,a,preview){if(!preview){clearOwned(owner,'grip');addProtection(c,c.f,p);}reset(x);},{unlock:3,reason:ready('grip')});
    }
    if(['chainEnemy','chainAlly'].indexOf(m)>=0){
      add('reattach','Réattribuer les maillons',2,3,'1 action, 2 EP, 3 EM. Remplace les deux extrémités sans augmenter la durée du lien ni créer un second lien.',function(x,a,preview){x.targets=[cid(effectTarget(a)),cid(fight().fighters[a.second])];if(!preview){clearOwned(owner,'chain');x.targets.forEach(function(id,i){putEffect(byCid(id),{kind:'chain',owner:owner,other:x.targets[1-i],ratio:m==='chainEnemy'?.25:.5,once:m==='chainAlly',expires:x.expires});});}},{unlock:1,target:m==='chainEnemy'?'enemies':'allies',reason:ready('link')});
      add('tighten','Resserrer pour un seul choc',2,3,'1 action, 2 EP, 3 EM. Le prochain transfert passe à '+(m==='chainEnemy'?50:75)+' % ; puis le lien se rompt. Aucun dégât supplémentaire créé.',function(x,a,preview){x.tightened=true;if(!preview)fight().fighters.forEach(function(f){activeEffects(f).forEach(function(e){if(e.owner===owner&&e.kind==='chain'){e.ratio=m==='chainEnemy'?.5:.75;e.once=true;}});});},{unlock:3,reason:s.stage!=='link'?'Aucun lien actif.':s.tightened?'Lien déjà resserré.':''});
    }
    if(m==='extractHarm')add('mother','Préparer la dose mère',0,3,'1 action, 3 EM, UNE fois par combat. Prépare un concentré de '+p+' dégâts sans extraire un effet ; la projection ultérieure reste une action payée.',function(x,a){setup(x,'distilled',a,3);x.pool=p;x.motherUsed=true;},{reason:s.motherUsed?'La dose mère a déjà été employée.':idle()});
    // Qualitative mastery: more ways to abandon, reassign or conserve a commitment.
    var redirectModels=['watchAttack','watchDefense','songCounter','bellsAttack','bellsDefense','repeatTest','huntLatest','huntRepeat','starChoice','starOrbit'];
    if(redirectModels.indexOf(m)>=0)add('redirect','Réviser l’engagement',1,2,'1 action, 1 EP, 2 EM. Change les cibles et recommence la lecture : aucune charge ou progression conservée.',function(x,a){var stage=x.stage;setup(x,stage,a);x.charges=0;x.lastKind='';x.lastTarget='';if(m==='starOrbit')x.facets=1;},{unlock:1,target:['huntLatest','starChoice'].indexOf(m)>=0?'enemies':m==='bellsDefense'?'ally':'enemy',reason:s.stage==='idle'?'Une préparation active est requise.':''});
    var sustainModels=['watchAttack','watchDefense','gripWeapon','gripSpell','storeHurt','storeGuard','flailLong','flailShort','chainEnemy','chainAlly','runeAttack','runeGuard','relayAttack','relayGuard','gemChoice','gemRisk','acid','smoke','extractHarm','extractGuard','predictDefense','repeatTest','songSequence','songCounter','bellsAttack','bellsDefense','choirAttack','choirDefense','wall','huntLatest','huntRepeat','starChoice','starOrbit','prismMagazine','prismReturn'];
    if(sustainModels.indexOf(m)>=0)add('sustain','Conserver l’engagement',0,3,'1 action, 3 EM. Prolonge une fois la préparation et ses effets liés d’un round. Ne remplace pas une cible disparue, une défense ou un événement requis.',function(x,a,preview){x.expires++;x.sustained=true;if(!preview)fight().fighters.forEach(function(f){activeEffects(f).forEach(function(e){if(e.owner===owner)e.expires++;});});},{unlock:2,reason:s.stage==='idle'||!s.expires?'Aucun engagement temporaire.':s.sustained?'Cet engagement a déjà été prolongé.':''});
    if(['hands','rage','blood'].indexOf(m)>=0)add('sacrifice','Se fermer pour durer',4,2,'1 action, 4 EP, 2 EM. Sacrifie toutes les mains engagées ou tous les crans pour '+p+' protection par cran ; aucune attaque incluse.',function(x,a,preview){var n=m==='hands'?x.hands:x.charges;x.hands=0;reset(x);if(!preview)addProtection(c,c.f,p*n);},{unlock:2,reason:(m==='hands'?s.hands:s.charges)<=0?'Aucun engagement à sacrifier.':''});
    if(['armement','magazine','watchAttack','watchDefense','pavoisSelf','pavoisAlly'].indexOf(m)>=0)add('unload','Désarmer sans perdre le carreau',2,0,'1 action, 2 EP. Retire les carreaux chargés sans les dépenser et annule la surtension ; aucune munition restaurée.',function(x){x.loaded=0;x.tension=0;},{unlock:2,reason:s.loaded<=0?'Aucun carreau chargé.':''});
    if(['guard','hands','swingSpread','swingFocus','rage','blood'].indexOf(m)>=0)add('commit','Frappe de dernier recours',10,4,'2 actions, 10 EP, 4 EM. Une seule frappe de '+(d+p*2)+' dégâts. Engage les deux mains ou trois crans et renonce à la préparation ; aucune défense supplémentaire.',function(x,a,preview){if(m==='hands')x.hands=2;else if(m==='rage'||m==='blood')x.charges=3;else reset(x);if(!preview)hit(c,a.target,d+p*2);},{unlock:3,actions:2,target:'enemy'});
    if(['gemChoice','gemRisk','prismMagazine','prismReturn','storeHurt','storeGuard','extractHarm','extractGuard'].indexOf(m)>=0)add('shelter','Tout refermer en abri',2,2,'1 action, 2 EP, 2 EM. Sacrifie l’intégralité de la préparation pour une protection personnelle de '+q+'. Aucun reliquat conservé.',function(x,a,preview){reset(x);if(!preview)addProtection(c,c.f,q);},{unlock:3,reason:s.stage==='idle'?'Aucune préparation à sacrifier.':''});
    if(['totemAttack','totemGuard'].indexOf(m)>=0)add('dismantle','Démonter l’idole en rempart',2,2,'1 action, 2 EP, 2 EM. Détruit l’idole et toutes ses charges ; protection personnelle égale à ses PV restants. Aucune nouvelle idole possible.',function(x,a,preview){var device=byCid(x.device),value=device?device.pvCur:0;if(!preview){killDevice(c);addProtection(c,c.f,value);}reset(x);},{unlock:3,reason:s.stage!=='totem'?'Idole absente.':''});
    cancel();
    ops.forEach(function(o){o.category=attackCategory(c);o.offensive=o.id==='grip'||o.id==='throw'&&m==='acid'||['shoot','punch','swing','strike','test','commit'].indexOf(o.id)>=0||o.id==='command'&&m==='totemAttack'||o.id==='release'&&['storeHurt','flailLong','flailShort','extractHarm','bellsAttack','starChoice','starOrbit','prismReturn'].indexOf(m)>=0;});
    return ops;
  }
  function counterOptions(fi){
    var f=fight().fighters[fi];if(!alive(f))return [];
    var options=[],ee=activeEffects(f);
    if(ee.some(function(e){return e.kind==='grip'||e.kind==='chain';}))options.push({id:'break',label:'Rompre la prise ou le lien',ep:4,em:0,actions:1,rule:'1 action, 4 EP. Retire les prises et chaînes reforgées de ce combattant.'});
    if(ee.some(function(e){return e.kind==='acid';}))options.push({id:'rinse',label:'Se rincer',ep:4,em:0,actions:1,rule:'1 action, 4 EP. Supprime toutes les morsures de corrosion encore actives.'});
    if(fight().fighters.some(function(o){return alive(o)&&o._rf&&o._rf.stage==='stars'&&o._rf.targets.indexOf(cid(f))>=0;}))options.push({id:'eclipse',label:'S’éclipser de la conjonction',ep:4,em:0,actions:1,rule:'1 action, 4 EP. Réponse réservée avant les rayons : retire ce combattant de toutes les conjonctions annoncées, même s’il agit après l’Astronome.'});
    return options;
  }
  function breakLinks(f,kind){activeEffects(f).forEach(function(e){if(e.kind===kind||kind==='links'&&(e.kind==='grip'||e.kind==='chain')){var source=byCid(e.owner);clearOwned(e.owner,e.kind);if(source&&source._rf)reset(source._rf);}});}
  function counterRun(fi,id){var f=fight().fighters[fi];if(id==='break')breakLinks(f,'links');if(id==='rinse')activeEffects(f).forEach(function(e){if(e.kind==='acid')e.spent=true;});if(id==='eclipse')fight().fighters.forEach(function(o){if(o._rf&&o._rf.stage==='stars'){o._rf.targets=o._rf.targets.filter(function(x){return x!==cid(f);});if(!o._rf.targets.length)reset(o._rf);}});}
  function spent(fi){return decl(fi).reduce(function(a,b){a.ep+=b.epCost||0;a.em+=b.emCost||0;return a;},{ep:0,em:0});}
  function validateTargets(c,op,a){
    if(!op.target||op.target==='none')return '';
    var target=effectTarget(a),ally=op.target.indexOf('all')===0,dual=['allies','enemies'].indexOf(op.target)>=0;
    if(!Number.isInteger(a.target)||!alive(target))return 'Choisir une cible vivante.';
    if(ally?!sameTeam(c.f,target):sameTeam(c.f,target)||a.target===c.fi)return ally?'Choisir un allié.':'Choisir un adversaire.';
    if(op.excludeSelf&&target===c.f)return 'Le porteur ne peut pas être bénéficiaire.';
    if(dual){var second=fight().fighters[a.second];if(!Number.isInteger(a.second)||!alive(second)||a.second===a.target)return 'Choisir deux combattants vivants distincts.';if(ally?!sameTeam(c.f,second):sameTeam(c.f,second))return 'Le second combattant doit appartenir au même camp que le premier.';if(op.excludeSelf&&second===c.f)return 'Le porteur ne peut pas être bénéficiaire.';}
    if(op.choice&&op.choice.indexOf(a.choice)<0)return 'Choisir une hypothèse valide.';
    return '';
  }
  function restrictions(fi,action,opts){
    var f=fight().fighters[fi],c=info(fi),s=c&&projected(fi),ee=activeEffects(f);
    if(f._rfDevice)return 'Une idole ne possède aucune action autonome.';
    var mode=(action==='frappe'||action==='pugilat')?'weapon':action==='capacite'||action==='soin'||action==='frappe_dechainees'||opts&&(opts.emCost||0)>0?'magic':'';
    if(ee.some(function(e){return e.kind==='grip'&&e.mode===mode;}))return 'Prise active : utiliser Se dégager ou une autre catégorie d’action.';
    if(c&&s&&s.stage==='grip'&&mode)return 'Les mains sont engagées dans la prise : la relâcher avant d’attaquer.';
    if(c&&c.model==='hands'&&s.hands>=2&&['frappe','pugilat'].indexOf(action)>=0)return 'Les deux mains sont engagées : reprendre la garde.';
    if(c&&action==='frappe'&&['Arbalétrier','Guetteur','Pavoisier'].indexOf(c.entry.name)>=0)return 'Utiliser le tir chargé dans les gestes du serment.';
    if(c&&action==='frappe'&&s.stage==='rotation')return 'Le fléau est engagé dans la rotation.';
    return '';
  }
  function getOptions(fi){
    var c=info(fi),f=fight().fighters[fi];if(!f)return [];
    var s=c&&saved(fi),project=c&&projected(fi),costs=spent(fi),left=w.cActionsLeft?w.cActionsLeft(fi):3;
    var ops=c?operations(c,project):[];
    return ops.map(function(op){var reason=op.reason||operationBlocked(c,op);if(op.actions>left)reason=reason||'Actions restantes insuffisantes.';if(op.ep>f.epCur-costs.ep||op.em>f.emCur-costs.em)reason=reason||'Ressources restantes insuffisantes.';return {action:'reforged',kind:'attack',label:op.label,palNom:c.branch?c.branch.name:'Gestes de l’arbalète',palierNiv:c.tier>=0?c.branch.levels[c.tier]:1,consumeActions:op.actions,epCost:op.ep,emCost:op.em,targetType:op.target,descText:op.rule,disabled:!!reason,reason:reason,rf:{id:op.id,key:c.key,model:c.model},choice:op.choice,excludeSelf:op.excludeSelf};});
  }
  function perform(fi,id,params){
    params=params||{};var cs=fight(),f=cs.fighters[fi],c=info(fi);
    if(!alive(f)||!cs.active||cs.phase!=='declaration')return notify('Le combat n’est pas en déclaration active.');
    if(cs.order[cs.turn]!==fi)return notify('Ce combattant ne déclare pas actuellement.');
    var counter=counterOptions(fi).find(function(o){return o.id===id;}),s=c&&projected(fi),op=counter||(c&&operations(c,s).find(function(o){return o.id===id;}));
    if(!op)return notify('Cette opération n’est pas débloquée ou disponible.');
    var reason=op.reason||(!counter&&operationBlocked(c,op))||'',costs=spent(fi),left=w.cActionsLeft?w.cActionsLeft(fi):3;
    if(op.actions>left)reason=reason||'Actions restantes insuffisantes.';
    if(op.ep>f.epCur-costs.ep||op.em>f.emCur-costs.em)reason=reason||'Ressources restantes insuffisantes.';
    if(!counter){var forced=op.offensive&&typeof w.cGetForcedTargetInfo==='function'&&w.cGetForcedTargetInfo(fi);if(forced&&alive(forced.source)&&op.target==='enemy')params=Object.assign({},params,{target:cs.fighters.indexOf(forced.source)});reason=reason||validateTargets(c,op,params);if(!reason&&op.validate)reason=op.validate(params);if(c&&s.stage==='grip'&&['release','cancel','braceGrip','releaseGuard','sustain'].indexOf(id)<0)reason=reason||'Relâcher d’abord la prise.';}
    if(reason)return notify(reason);
    if(w.combatSnapshot)w.combatSnapshot();
    var a={action:'reforged',kind:'attack',label:op.label,value:0,consumeActions:op.actions,epCost:op.ep,emCost:op.em,target:params.target,rf:{id:id,params:clone(params),key:c&&c.key,model:c&&c.model,counter:!!counter,uid:'rf-action-'+(++serial)}};
    (cs.decl=cs.decl||{})[fi]=decl(fi).concat([a]);
    if(w.cActionsLeft&&w.cActionsLeft(fi)<=0){cs.turn++;if(w._nextDeclarant)w._nextDeclarant();}
    redraw();return {ok:true,entry:a};
  }
  function contactTarget(c,target){
    var forced=typeof w.cGetForcedTargetInfo==='function'&&w.cGetForcedTargetInfo(c.fi);if(forced&&alive(forced.source))target=fight().fighters.indexOf(forced.source);
    var original=fight().fighters[target],redirected=typeof w.cFindAutoInterpose==='function'&&w.cFindAutoInterpose(original);return redirected?fight().fighters.indexOf(redirected):target;
  }
  function contactDefended(fi){var def=firstDefense(fi);if(!def)return false;(fight()._usedDefs=fight()._usedDefs||{})[fi+'_def']=((fight()._usedDefs||{})[fi+'_def']||0)+1;defenseEvent(fi,def);log(fight().fighters[fi].name+' défend le contact : préparation empêchée.');return true;}
  function createDevice(c,s){
    var device={name:c.f.name+' · Idole',type:c.f.type,team:c.f.team,isSummon:true,_rfDevice:true,ownerPid:c.f.pid,ownerCid:cid(c.f),classe:'Idole',level:c.level,pvCur:c.pool,pvMax:c.pool,epCur:0,epMax:0,emCur:0,emMax:0,dmgBase:0,actionsMax:0,statuts:[]};
    s.device=cid(device);fight().fighters.push(device);log('Idole créée : '+c.pool+' PV, aucune action autonome.');
  }
  function killDevice(c){var s=c.f._rf,device=s&&byCid(s.device);if(device){device.pvCur=0;clearOwned(cid(c.f));}if(s&&s.device){s.charges=0;s.pool=0;}}
  function eachState(fn){fight().fighters.forEach(function(f,fi){var c=info(fi);if(c&&f._rf&&alive(f)&&c.tier>=0)fn(c,f._rf);});}
  function attackEvent(fi,attack){
    var f=fight().fighters[fi],id=cid(f),kind=category(attack);
    activeEffects(f).forEach(function(e){if(e.kind==='power'){attack.value+=e.amount;e.spent=true;}if(e.kind==='shield'&&e.breakOnAttack)e.spent=true;});
    eachState(function(c,s){
      if(s.stage==='idle'||expiring(s))return;
      var selected=s.targets.indexOf(id)>=0;
      if(c.model==='watchAttack'&&s.stage==='watch'&&selected){var target=fi;reset(s);hit(c,target,c.strike,{_rfReaction:true});}
      if(c.model==='songCounter'&&s.stage==='counter'&&selected&&kind==='magic'){attack.value=Math.max(0,attack.value-c.power);reset(s);log(c.f.name+' affaiblit l’attaque magique de '+f.name+'.');}
      if(c.model==='repeatTest'&&s.stage==='observing'&&selected){if(s.lastKind===kind&&s.charges>0){attack.value=Math.max(0,attack.value-c.power);s.charges--;log(c.f.name+' sanctionne une catégorie répétée : −'+c.power+' dégâts.');}s.lastKind=kind;if(!s.charges)reset(s);}
      if(c.model==='songSequence'&&s.stage==='song'&&selected&&s.sequence===0)s.sequence=1;
      if(c.model==='choirAttack'&&s.stage==='choir'&&id===s.targets[s.sequence])s.sequence=Math.min(2,s.sequence+1);
      if(c.model==='bellsAttack'&&s.stage==='bells'&&selected)s.charges=Math.min(3,s.charges+1);
      if(c.model==='huntLatest'&&s.stage==='hunt'&&selected)s.lastTarget=id;
      
      if(c.model==='relayAttack'&&s.stage==='woven'&&selected){if(s.sequence===0){attack.value+=c.power;s.sequence=1;s.first=id;}else if(s.sequence===1&&s.first!==id){attack.value+=Math.ceil(c.power/2);reset(s);}}
    });
  }
  function defenseEvent(fi,def){
    var f=fight().fighters[fi],id=cid(f),own=info(fi),state=f._rf;
    if(own&&state){if(own.model==='armement')state.tension=0;if(['flailLong','flailShort'].indexOf(own.model)>=0&&state.stage==='rotation'){reset(state);log(f.name+' interrompt sa rotation par une défense utilisée.');}}
    activeEffects(f).forEach(function(e){if(e.kind==='power'&&e.mature&&!e.matured){e.amount+=e.mature;e.matured=true;}});
    eachState(function(c,s){
      if(expiring(s))return;var selected=s.targets.indexOf(id)>=0;
      if(c.model==='watchDefense'&&s.stage==='watch'&&selected){reset(s);hit(c,fi,c.strike,{_rfReaction:true});}
      if(c.model==='songSequence'&&s.stage==='song'&&selected&&s.sequence===1)s.sequence=2;
      if(c.model==='bellsDefense'&&s.stage==='bells'&&selected)s.charges=Math.min(3,s.charges+1);
      if(c.model==='choirDefense'&&s.stage==='choir'&&selected&&s.seen.indexOf(id)<0){s.seen.push(id);s.sequence=s.seen.length;}
    });
  }
  function rawDamage(target,damage){
    var context=resolving[resolving.length-1],incoming=Math.max(0,Math.ceil(damage||0)),source=context&&fight().fighters[context.fi];
    if(!incoming)return originals.cApplyRawDamage.apply(this,arguments);
    var ownFi=fight().fighters.indexOf(target),c=info(ownFi),s=c&&target._rf;
    if(s&&c.model==='hands')incoming+=2*s.hands;
    if(s&&c.model==='rage')incoming+=2*s.charges;
    // Brise-Armure is part of the same incoming impact before finite new wards.
    if(target.briseArmureBonus){incoming+=target.briseArmureBonus;target.briseArmureBonus=0;}
    activeEffects(target).forEach(function(e){
      if(e.kind!=='shield'||e.amount<=0)return;
      if(e.physicalOnly&&(!context||category(context.attack)!=='weapon'))return;
      if(e.device&&!alive(byCid(e.device))){e.spent=true;return;}
      var taken=Math.min(incoming,e.amount);incoming-=taken;e.amount-=taken;if(!e.amount)e.spent=true;
      if(e.pavois){var pavoisOwner=byCid(e.owner);if(pavoisOwner&&pavoisOwner._rf)pavoisOwner._rf.pool=e.amount;}
      if(taken)log(target.name+' absorbe '+taken+' avec sa protection ('+e.amount+' restant).');
    });
    eachState(function(other,rs){
      if((other.model==='relayGuard'&&rs.stage==='woven'||other.model==='wall'&&rs.stage==='wall')&&rs.targets.indexOf(cid(target))>=0){var take=Math.min(incoming,rs.pool);incoming-=take;rs.pool-=take;if(!rs.pool)reset(rs);}
    });
    if(s&&c.model==='debt'&&s.stage==='debt'&&s.pool>0){var deferred=Math.min(incoming,s.pool);incoming-=deferred;s.pool=0;s.debt+=deferred;log(target.name+' reporte '+deferred+' dégâts en dette.');}
    var chain=activeEffects(target).find(function(e){return e.kind==='chain'&&alive(byCid(e.other));});
    if(chain&&incoming>0){var amount=Math.floor(incoming*chain.ratio),partner=byCid(chain.other);incoming-=amount;if(chain.once){clearOwned(chain.owner,'chain');var chainOwner=byCid(chain.owner);if(chainOwner&&chainOwner._rf)reset(chainOwner._rf);}if(amount){var oldBonus=partner.briseArmureBonus;partner.briseArmureBonus=0;var transfer=originals.cApplyRawDamage(partner,amount);partner.briseArmureBonus=oldBonus;afterHurt(partner,transfer.dmg,source);log(partner.name+' reçoit '+transfer.dmg+' dégâts transférés, sans nouvelle attaque.');}}
    var result=originals.cApplyRawDamage.call(this,target,incoming);
    if(result.dmg>0)afterHurt(target,result.dmg,source);return result;
  }
  function afterHurt(target,damage,source){
    if(source)eachState(function(hunter,hs){if(hunter.model==='huntRepeat'&&hs.stage==='hunt'&&hs.targets[0]===cid(source)&&sameTeam(hunter.f,target))hs.charges=target===hunter.f?0:1;});
    var fi=fight().fighters.indexOf(target),c=info(fi),s=target._rf;
    if(c&&s){
      if(c.model==='guard'&&s.stage==='guard'){s.stage='opening';s.expires=round()+1;}
      if(['storeHurt','storeGuard'].indexOf(c.model)>=0&&s.stage==='chamber'){s.pool=Math.min(damage,c.pool);s.stage='charged';s.expires=round()+1;log(target.name+' stocke '+s.pool+' dégâts réellement subis.');}
      if(c.model==='gemRisk'&&s.stage==='gem'){reset(s);log(target.name+' perd sa gemme sous l’impact.');}
      if(c.model==='songCounter'&&s.stage==='counter'){reset(s);log(target.name+' perd le contrechant sous l’impact.');}
      if(c.model==='wall'&&s.stage==='wall'){s.pool=Math.max(0,s.pool-damage);if(!s.pool)reset(s);}
      if(s.stage==='grip'&&source&&cid(source)!==s.targets[0]){if(s.resilient)s.resilient=false;else{clearOwned(cid(target),'grip');reset(s);}}
    }
    activeEffects(target).forEach(function(e){if(e.kind==='grip'&&source&&cid(source)!==e.owner){var holder=byCid(e.owner);if(holder&&holder._rf&&holder._rf.resilient)holder._rf.resilient=false;else breakLinks(target,'grip');}});
    if(target._rfDevice&&!alive(target)){var owner=byCid(target.ownerCid);if(owner&&owner._rf){reset(owner._rf);clearOwned(target.ownerCid);}log('L’idole de '+(owner&&owner.name||'son porteur')+' est détruite.');}
  }
  function resolveAttack(attacker,fi,atk){
    if(atk._rfUtilityKind!==undefined){
      var prevented=activeEffects(attacker).some(function(e){return e.kind==='grip'&&e.mode==='magic';});
      atk.kind=atk._rfUtilityKind;delete atk._rfUtilityKind;
      if(prevented){atk.action='annule';log(attacker.name+' : capacité énergétique interrompue par la prise ; coût engagé conservé.');}
      return;
    }
    if(atk.rf){
      if(atk.rf.resolved)return;atk.rf.resolved=true;
      if(atk.rf.counter){counterRun(fi,atk.rf.id);log(attacker.name+' · '+atk.label);return;}
      var c=info(fi);if(!c||c.key!==atk.rf.key||c.model!==atk.rf.model)return;
      var s=saved(fi),op=operations(c,s).find(function(o){return o.id===atk.rf.id;}),a=atk.rf.params;
      var reason=!op?'Opération devenue indisponible.':op.reason||operationBlocked(c,op)||validateTargets(c,op,a);if(!reason&&op.validate)reason=op.validate(a);
      if(reason){log(attacker.name+' · '+atk.label+' interrompu : '+reason+' Coût engagé conservé.');return;}
      op.run(s,a,false);s.records.push({round:round(),id:op.id,label:op.label});if(s.records.length>40)s.records.shift();log(attacker.name+' · '+op.label+' ('+op.actions+' action, '+op.ep+' EP, '+op.em+' EM).');return;
    }
    if(['parer','esquive','bloquer'].indexOf(atk.action)>=0){var dc=info(fi),ds=dc&&saved(fi);if(ds&&dc.model==='armement')ds.tension=0;if(ds&&['flailLong','flailShort'].indexOf(dc.model)>=0&&ds.stage==='rotation'){reset(ds);log(attacker.name+' interrompt sa rotation pour défendre.');}return;}
    if(!isAttack(atk)&&!atk._rfHit)return originals.cResolveAttackInstance.apply(this,arguments);
    var mode=category(atk),blocked=activeEffects(attacker).some(function(e){return e.kind==='grip'&&e.mode===mode;});
    if(blocked){log(attacker.name+' : attaque empêchée par la prise ; coût engagé conservé.');return;}
    var copy=Object.assign({},atk);attackEvent(fi,copy);if(!alive(attacker))return;
    var pairs=typeof w.cGetAttackTargets==='function'?w.cGetAttackTargets(fi,attacker,copy):[{ti:copy.target,target:fight().fighters[copy.target]}];
    var defenses=pairs.map(function(v){var redirected=typeof w.cFindAutoInterpose==='function'&&w.cFindAutoInterpose(v.target),ti=redirected?fight().fighters.indexOf(redirected):v.ti;return {fi:ti,before:(fight()._usedDefs||{})[ti+'_def']||0,def:firstDefense(ti,copy)};});
    resolving.push({fi:fi,attack:copy});var result;
    try{result=originals.cResolveAttackInstance.call(this,attacker,fi,copy);}finally{resolving.pop();}
    defenses.forEach(function(v){if(v.def&&((fight()._usedDefs||{})[v.fi+'_def']||0)>v.before)defenseEvent(v.fi,v.def);});return result;
  }
  function beforeRound(){
    eachState(function(c,s){if(expiring(s)){clearOwned(cid(c.f));reset(s);log(c.f.name+' : préparation expirée, aucun coût remboursé.');}});
    fight().fighters.forEach(function(f,fi){
      var c=info(fi),s=c&&clone(saved(fi)),ep=f.epCur,em=f.emCur;
      decl(fi).forEach(function(a){
        if(c&&['parer','esquive','bloquer'].indexOf(a.action)>=0)a.kind='attack';
        if(!a.rf&&(a.emCost||0)>0&&!isAttack(a)&&a.action!=='annule'){a._rfUtilityKind=a.kind;a.kind='attack';}
        var reason='';if(a.rf&&!a.rf.counter){var op=c&&operations(c,s).find(function(o){return o.id===a.rf.id;});reason=!op?'Opération non disponible.':op.reason||validateTargets(c,op,a.rf.params);if(!reason&&op.validate)reason=op.validate(a.rf.params);}
        if((a.epCost||0)>ep||(a.emCost||0)>em)reason=reason||'Ressources insuffisantes.';
        if(reason&&a.rf){a.action='annule';a.kind='utility';a.epCost=0;a.emCost=0;log(f.name+' : '+a.label+' annulé avant paiement ('+reason+').');}
        else{ep-=a.epCost||0;em-=a.emCost||0;if(a.rf&&!a.rf.counter&&op)op.run(s,a.rf.params,true);}
      });
    });
    fight().fighters.forEach(function(f,fi){decl(fi).forEach(function(a){if(a.action!=='annule'&&a.rf&&a.rf.counter&&a.rf.id==='eclipse'&&!a.rf.resolved){counterRun(fi,'eclipse');a.rf.resolved=true;log(f.name+' réserve son éclipse avant les rayons annoncés.');}});});
  }
  function settledDamage(target,amount){var bonus=target.briseArmureBonus;target.briseArmureBonus=0;try{return originals.cApplyRawDamage(target,amount);}finally{target.briseArmureBonus=bonus;}}
  function afterRound(oldRound){
    // Called after legacy combatResolve increments round. Acid and debt belong to the completed round.
    fight().fighters.forEach(function(f){
      effects(f).forEach(function(e){if(!e.spent&&e.kind==='acid'&&e.ticks>0&&alive(f)){var result=settledDamage(f,e.amount);if(result.dmg>0)afterHurt(f,result.dmg,byCid(e.owner));e.ticks--;if(!e.ticks)e.spent=true;log(f.name+' : corrosion −'+result.dmg+' PV ('+e.ticks+' morsure restante).');}});
    });
    eachState(function(c,s){
      if(c.model==='debt'&&s.debt>0&&oldRound>=s.debtDue){var debt=s.debt;s.debt=0;var result=settledDamage(c.f,debt);reset(s);log(c.f.name+' règle sa dette : −'+result.dmg+' PV.');}
      if(c.model==='gemRisk'&&s.stage==='gem'||c.model==='starOrbit'&&s.stage==='stars')s.facets=Math.min(3,s.facets+1);
      if(s.stage==='rune'&&!activeEffects(byCid(s.targets[0])||c.f).some(function(e){return e.owner===cid(c.f);}))reset(s);
      if(expiring(s)){clearOwned(cid(c.f));reset(s);}
    });
    // A delayed effect can cause the final KO after the legacy victory check.
    var players=fight().fighters.some(function(f){return alive(f)&&f.type==='player'&&!f._rfDevice;}),enemies=fight().fighters.some(function(f){return alive(f)&&f.type==='beast'&&!f._rfDevice;});
    if(!players||!enemies){fight().active=false;fight().phase='idle';}
  }
  function redraw(){if(w.rCombat&&w.document)w.rCombat('p-combat-mj-c');}
  function select(fi,op,second){
    var f=fight().fighters[fi],ally=op.targetType&&op.targetType.indexOf('all')===0;
    return '<select id="rf-'+(second?'second':'target')+'-'+fi+'-'+op.rf.id+'" aria-label="'+(second?'Seconde cible':'Cible')+'"><option value="">'+(second?'Seconde cible…':'Choisir '+(ally?'un allié':'un adversaire')+'…')+'</option>'+fight().fighters.map(function(v,i){if(!alive(v)||sameTeam(f,v)!==ally||(!ally&&i===fi)||(op.excludeSelf&&i===fi))return '';return '<option value="'+i+'">'+html(v.name)+'</option>';}).join('')+'</select>';
  }
  function status(fi){var c=info(fi),s=c&&projected(fi);if(!s)return '';
    var labels={idle:'Aucun engagement',watch:'Tir réservé',closed:'Pavois fermé',guard:'Garde armée',opening:'Coup préparé',grip:'Prise tenue',chamber:'Chambre ouverte',charged:'Impact stocké',rotation:'Rotation engagée',link:'Lien actif',swing:'Balancement',rune:'Rune inscrite',woven:'Trame tendue',gem:'Gemme en croissance',dose:'Dose préparée',distilled:'Reliquat en fiole',prediction:'Hypothèse annoncée',observing:'Contre-épreuve active',song:'Mesure en cours',counter:'Contrechant tenu',bells:'Cloches accordées',choir:'Voix en cours',rage:'Engagement',debt:'Dette armée',wall:'Mur partagé',hunt:'Piste ouverte',totem:'Idole plantée',stars:'Conjonction annoncée',prism:'Facettes chargées',residual:'Reliquat lumineux'};
    var parts=[labels[s.stage]||s.stage];
    if(['Arbalétrier','Guetteur','Pavoisier'].indexOf(c.entry.name)>=0)parts.push(s.loaded+' chargé(s) · '+s.ammo+'/6 carreaux');
    if(c.model==='hands')parts.push(s.hands+'/2 mains engagées');
    if(s.charges)parts.push(s.charges+' charge(s)');if(s.pool)parts.push('Réserve '+s.pool);if(s.facets)parts.push(s.facets+' facette(s)');if(s.debt)parts.push('Dette '+s.debt+' PV');
    if(['acid','smoke'].indexOf(c.model)>=0)parts.push(s.vials+'/3 fioles');
    if(s.targets.length)parts.push(s.targets.map(function(id){var f=byCid(id);return f?f.name:'Cible absente';}).join(' / '));
    if(s.expires)parts.push('Expire après R'+s.expires);if(s.sequence)parts.push('Progression '+s.sequence+'/2');return parts.join(' · ');
  }
  function effectSummary(fi){var f=fight().fighters[fi];if(!f)return '';return activeEffects(f).map(function(e){var owner=byCid(e.owner),suffix=owner?' · '+owner.name:'';return (e.kind==='shield'?'Protection '+e.amount+(e.physicalOnly?' physique':''):e.kind==='power'?'Prochaine attaque +'+e.amount:e.kind==='acid'?'Corrosion '+e.amount+' × '+e.ticks:e.kind==='grip'?'Prise '+(e.mode==='weapon'?'d’arme':'de souffle'):e.kind==='chain'?'Transfert '+Math.round(e.ratio*100)+' %':'Effet')+suffix;}).join(' | ');}
  function render(fi){
    var c=info(fi),counter=counterOptions(fi),h='';
    if(c){h+='<section class="rf-combat"><div class="rf-combat-head"><strong>'+html(c.branch?c.branch.name:'Choisir une branche')+'</strong><span>'+html(status(fi))+'</span></div>';
      if(c.tier<0)h+='<p>Première capacité au niveau '+(c.entry.parent?10:2)+'. Les gestes ordinaires restent disponibles.</p>';
      getOptions(fi).forEach(function(op){h+='<article class="rf-operation">';if(op.targetType!=='none'){h+=select(fi,op,false);if(['allies','enemies'].indexOf(op.targetType)>=0)h+=select(fi,op,true);}if(op.choice)h+='<select id="rf-choice-'+fi+'-'+op.rf.id+'" aria-label="Hypothèse">'+op.choice.map(function(v){return '<option value="'+v+'">'+({esquive:'Esquive',parer:'Parade',bloquer:'Blocage'}[v]||v)+'</option>';}).join('')+'</select>';
        h+='<button '+(op.disabled?'disabled title="'+html(op.reason)+'"':'onclick="NPSermentsReforgedCombat.click('+fi+',\''+op.rf.id+'\')"')+'><strong>'+html(op.label)+'</strong><span>'+op.consumeActions+' action · '+op.epCost+' EP · '+op.emCost+' EM</span></button><p>'+html(op.descText)+'</p>'+(op.disabled?'<small>'+html(op.reason)+'</small>':'')+'</article>';});h+='</section>';
    }
    if(counter.length){h+='<div class="rf-counters"><strong>Réponses aux engagements adverses</strong>';counter.forEach(function(op){var s=spent(fi),disabled=(w.cActionsLeft&&w.cActionsLeft(fi)<1)||fight().fighters[fi].epCur-s.ep<op.ep;h+='<button '+(disabled?'disabled':'onclick="NPSermentsReforgedCombat.perform('+fi+',\''+op.id+'\',{})"')+'>'+html(op.label)+' · 1 action · '+op.ep+' EP</button>';});h+='</div>';}
    return h;
  }
  function click(fi,id){var get=function(k){var el=w.document.getElementById('rf-'+k+'-'+fi+'-'+id);return el?el.value:'';},target=get('target'),second=get('second');return perform(fi,id,{target:target===''?undefined:Number(target),second:second===''?undefined:Number(second),choice:get('choice')||undefined});}
  function install(){
    if(api.installed||typeof w.cResolveAttackInstance!=='function')return false;
    ['cGetAbilityOptions','cBuildAbilityOptionsForPalier','cRenderAbilityButtons','cDeclareAction','cResolveAttackInstance','cApplyRawDamage','combatResolve','combatStart','cActionsMax','cTickStatuts'].forEach(function(k){originals[k]=w[k];});
    w.cGetAbilityOptions=function(fi){return info(fi)?getOptions(fi):originals.cGetAbilityOptions.apply(this,arguments);};
    w.cBuildAbilityOptionsForPalier=function(inf){if(inf&&inf.fighter&&entryFor(inf.fighter))return getOptions(fight().fighters.indexOf(inf.fighter));return originals.cBuildAbilityOptionsForPalier.apply(this,arguments);};
    w.cRenderAbilityButtons=function(fi){return (info(fi)?'':originals.cRenderAbilityButtons.apply(this,arguments))+render(fi);};
    w.cActionsMax=function(fi){return fight().fighters[fi]&&fight().fighters[fi]._rfDevice?0:originals.cActionsMax.apply(this,arguments);};
    w.cDeclareAction=function(fi,action,opts){
      opts=opts||{};if(opts.rf)return perform(fi,opts.rf.id,opts.rf.params||opts);
      var c=info(fi),why=restrictions(fi,action,opts);if(why)return notify(why);
      if(c&&['capacite','soin','frappe_dechainees'].indexOf(action)>=0)return notify('Utiliser les opérations chiffrées de la branche choisie.');
      if(c&&action!=='passer'){var cost={frappe:6,pugilat:6,esquive:8,bloquer:5,parer:2,deplacer:10,subit:0}[action],s=spent(fi);if(cost!==undefined&&cost>fight().fighters[fi].epCur-s.ep)return notify('EP insuffisants après les actions déjà réservées.');}
      var before=decl(fi).length,result=originals.cDeclareAction.apply(this,arguments),added=decl(fi)[before];if(c&&added&&action==='parer')added.epCost=2;return result;
    };
    w.cResolveAttackInstance=resolveAttack;w.cApplyRawDamage=rawDamage;
    if(originals.cTickStatuts)w.cTickStatuts=function(f){var before=f.pvCur,result=originals.cTickStatuts.apply(this,arguments);if(before>f.pvCur)afterHurt(f,before-f.pvCur,null);return result;};
    w.combatResolve=function(){
      if(fight().phase!=='resolution')return originals.combatResolve.apply(this,arguments);
      var prior=round(),snapshot=w.combatSnapshot,result;
      // Snapshot before cancellations, projections or reserved responses. Suppress the
      // nested legacy snapshot so one Undo restores the complete pre-resolution state.
      if(snapshot)snapshot();
      w.combatSnapshot=function(){};
      try{beforeRound();result=originals.combatResolve.apply(this,arguments);if(round()>prior){afterRound(prior);redraw();}}
      finally{w.combatSnapshot=snapshot;}
      return result;
    };
    w.combatStart=function(){if(!fight().active){fight().fighters=fight().fighters.filter(function(f){return !f._rfDevice;});fight().fighters.forEach(function(f){delete f._rf;delete f._rfEffects;if(registry[f.classe]){delete f._np70;delete f._np70Branch;}});fight().reforgedVersion=2;}return originals.combatStart.apply(this,arguments);};
    api.installed=true;return true;
  }
  function describe(name,key,level){
    var e=registry[name],b=e&&e.branches.find(function(v){return v.key===key;});if(!b)return null;
    var tier=b.levels.filter(function(v){return v<=level;}).length-1;if(tier<0)return {operations:[]};
    var f={name:'Porteur',classe:name,pvCur:999,pvMax:999,type:'player'},c={fi:-1,f:f,entry:e,branch:b,key:key,model:b.model,level:level,tier:tier,power:b.power[tier],strike:b.strike[tier]+level,pool:b.pool[tier]},s=fresh(c);
    // Include state-dependent actions in the rulebook even when currently unavailable.
    return {name:b.name,model:b.model,rule:b.rule,level:level,operations:operations(c,s).map(function(o){return {id:o.id,label:o.label,cost:{actions:o.actions,ep:o.ep,em:o.em},target:o.target,rule:o.rule,unlock:o.unlock,offensive:!!o.offensive,category:o.category};})};
  }
  var api={version:'2.0.0',catalog:CATALOG,info:info,getState:projected,getOptions:getOptions,perform:perform,click:click,render:render,status:status,effectSummary:effectSummary,describe:describe,install:install,_test:{fresh:fresh,operations:operations,entryFor:entryFor,rawDamage:rawDamage,attackEvent:attackEvent,defenseEvent:defenseEvent,beforeRound:beforeRound,afterRound:afterRound,resolveAttack:resolveAttack}};
  w.NPSermentsReforgedCombat=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;install();
})(typeof window!=='undefined'?window:globalThis);

/* Painted weapons shared by the catalogue, sheets, RPG and combat. */
(function(root){
  "use strict";
  var art={"Arbalétrier":"assets/serments/painted/arbaletrier.jpg","Pugiliste":"assets/serments/painted/pugiliste.jpg","Porte-Fléau":"assets/serments/painted/porte-fleau.jpg","Enchanteur":"assets/serments/painted/enchanteur.jpg","Alchimiste":"assets/serments/painted/alchimiste.jpg","Barde":"assets/serments/painted/barde.jpg","Duelliste":"assets/serments/painted/duelliste.jpg","Sauvageon":"assets/serments/painted/sauvageon.jpg","Croisé":"assets/serments/painted/croise.jpg","Rôdeur":"assets/serments/painted/rodeur.jpg","Traqueur":"assets/serments/painted/traqueur.jpg","Flécheur":"assets/serments/painted/flecheur.jpg","Elementaliste":"assets/serments/painted/elementaliste.jpg","Evocateur":"assets/serments/painted/evocateur.jpg","Conjurateur":"assets/serments/painted/conjurateur.jpg","Arcaniste":"assets/serments/painted/arcaniste.jpg","Guetteur":"assets/serments/painted/guetteur.jpg","Pavoisier":"assets/serments/painted/pavoisier.jpg","Lutteur":"assets/serments/painted/lutteur.jpg","Cestuaire":"assets/serments/painted/cestuaire.jpg","Entraveur":"assets/serments/painted/entraveur.jpg","Pendulier":"assets/serments/painted/pendulier.jpg","Tisserand":"assets/serments/painted/tisserand.jpg","Orfèvre":"assets/serments/painted/orfevre.jpg","Distillateur":"assets/serments/painted/distillateur.jpg","Essayeur":"assets/serments/painted/essayeur.jpg","Carillonneur":"assets/serments/painted/carillonneur.jpg","Chef de Chœur":"assets/serments/painted/chef-de-choeur.jpg","Ravageur":"assets/serments/painted/ravageur.jpg","Bastion":"assets/serments/painted/bastion.jpg","Veneur":"assets/serments/painted/veneur.jpg","Totémiste":"assets/serments/painted/totemiste.jpg","Astronome":"assets/serments/painted/astronome.jpg","Prismancien":"assets/serments/painted/prismancien.jpg","Bretteur":"assets/serments/painted/bretteur.jpg","Claymore":"assets/serments/painted/claymore.jpg","Lame d'Honneur":"assets/serments/painted/lame-d-honneur.jpg","Lame d’Honneur":"assets/serments/painted/lame-d-honneur.jpg","Rodeur":"assets/serments/painted/rodeur.jpg","Flecheur":"assets/serments/painted/flecheur.jpg","Élémentaliste":"assets/serments/painted/elementaliste.jpg","Évocateur":"assets/serments/painted/evocateur.jpg"};
  function attr(value){return String(value==null?"":value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  root.NPSermentArt=Object.freeze(art);
  root.npSermentEmblem=function(name,size,cssClass){
    var dimension=Math.max(16,Math.min(512,Math.round(Number(size)||32)));
    var className="np-serment-emblem"+(cssClass?" "+String(cssClass):"");
    var file=Object.prototype.hasOwnProperty.call(art,name)?art[name]:"";
    if(file&&/^assets\/serments\/painted\/[a-z0-9-]+\.jpg$/.test(file)){
      if(dimension<=64) file=file.replace(/\.jpg$/,"-thumb.jpg");
      return '<img class="'+attr(className)+'" src="'+attr(file)+'" width="'+dimension+'" height="'+dimension+'" alt="Arme du serment '+attr(name)+'" loading="lazy" decoding="async" style="display:inline-block;vertical-align:middle;flex-shrink:0;object-fit:contain">';
    }
    var legacy=root.NPSermentsExpansion&&root.NPSermentsExpansion.emblems;
    file=legacy&&legacy[name];
    if(file&&/^assets\/serments\/[a-z0-9-]+\.svg$/.test(file)){
      return '<img class="'+attr(className)+'" src="'+attr(file)+'" width="'+dimension+'" height="'+dimension+'" alt="Arme du serment '+attr(name)+'" loading="lazy" decoding="async">';
    }
    return '<span class="'+attr(className)+' np-serment-monogram" role="img" aria-label="'+attr(name)+'" style="display:inline-flex;align-items:center;justify-content:center;width:'+dimension+'px;height:'+dimension+'px">'+attr(String(name||"S").slice(0,1))+'</span>';
  };
})(typeof window!=="undefined"?window:globalThis);

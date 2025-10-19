// Debug temporaneo per testare l'icona fluttuante
console.log("🔍 DEBUG: Stato floating contact cambiato!");

export const debugFloatingContact = (state) => {
  console.log("🎯 Stato showFloatingContact:", state.showFloatingContact);
  console.log("🎯 Stato contactDeclined:", state.contactDeclined);
  console.log("🎯 Stato showAlternativeOffer:", state.showAlternativeOffer);
};
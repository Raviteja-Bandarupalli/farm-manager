// Manual script to add the missing Durga section to Station Shed batch
// Run this once to add the Durga section to localStorage

const batchId = "1768357455706" // Station Shed batch ID
const durgaWorkerId = "1768356232517" // Replace with actual Durga worker ID

const newSection = {
  batchId: batchId,
  name: "Durga Section",
  workerId: durgaWorkerId,
  initialBirds: 7000,
  id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
  createdAt: new Date().toISOString(),
}

// Get existing sections
const existingSections = JSON.parse(localStorage.getItem("poultry_batch_sections") || "[]")

// Add the new Durga section
existingSections.push(newSection)

// Save back to localStorage
localStorage.setItem("poultry_batch_sections", JSON.stringify(existingSections))

console.log("Added Durga section:", newSection)
console.log("Total sections now:", existingSections.length)

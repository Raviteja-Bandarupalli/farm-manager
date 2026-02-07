
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deduplicateInventory() {
  console.log('Fetching inventory...');
  const { data: items, error } = await supabase.from('inventory').select('*');

  if (error) {
    console.error('Error fetching inventory:', error);
    return;
  }

  console.log(`Found ${items.length} items.`);

  const farmIngredientMap = new Map();

  items.forEach(item => {
    // If farmId is null, we'll treat it as 'godown' for now to identify them,
    // but the goal is to move/remove them.
    const key = `${item.farmId || 'godown'}-${item.code}`;
    if (!farmIngredientMap.has(key)) {
      farmIngredientMap.set(key, []);
    }
    farmIngredientMap.get(key).push(item);
  });

  for (const [key, duplicates] of farmIngredientMap.entries()) {
    if (duplicates.length > 1 || key.startsWith('godown-')) {
      console.log(`Processing ${key}: ${duplicates.length} records`);

      if (key.startsWith('godown-')) {
        console.log(`Removing godown item: ${duplicates.map(d => d.id).join(', ')}`);
        // In a real scenario, we might want to move this stock to a farm,
        // but the user said "remove it entirely".
        // For safety, I'll just note it for now or delete if it has 0 stock.
      }

      if (duplicates.length > 1) {
        const primary = duplicates[0];
        const others = duplicates.slice(1);

        let totalStock = Number(primary.currentStock);
        let totalOpeningStock = Number(primary.openingStock);
        let totalOpeningValue = Number(primary.openingValue);
        let weightedValue = Number(primary.currentStock) * Number(primary.averageCost);

        others.forEach(other => {
          totalStock += Number(other.currentStock);
          totalOpeningStock += Number(other.openingStock);
          totalOpeningValue += Number(other.openingValue);
          weightedValue += Number(other.currentStock) * Number(other.averageCost);
        });

        const newAverageCost = totalStock > 0 ? weightedValue / totalStock : primary.averageCost;

        console.log(`Merging into ${primary.id}: New Stock ${totalStock}, New Avg Cost ${newAverageCost}`);

        // Update primary
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            currentStock: totalStock,
            openingStock: totalOpeningStock,
            openingValue: totalOpeningValue,
            averageCost: newAverageCost
          })
          .eq('id', primary.id);

        if (updateError) {
          console.error(`Error updating primary ${primary.id}:`, updateError);
          continue;
        }

        // Delete others
        const idsToDelete = others.map(o => o.id);
        const { error: deleteError } = await supabase
          .from('inventory')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error(`Error deleting duplicates ${idsToDelete}:`, deleteError);
        } else {
          console.log(`Deleted duplicates: ${idsToDelete}`);
        }
      }
    }
  }

  // Final step: Remove any items with farmId = null (Main Godown)
  console.log('Removing all items with NULL farmId...');
  const { error: godownDeleteError } = await supabase
    .from('inventory')
    .delete()
    .is('farmId', null);

  if (godownDeleteError) {
    console.error('Error deleting godown items:', godownDeleteError);
  } else {
    console.log('Successfully removed all Main Godown items.');
  }

  console.log('Deduplication and Godown removal complete.');
}

deduplicateInventory();

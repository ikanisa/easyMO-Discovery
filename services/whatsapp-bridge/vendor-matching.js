// Vendor Matching Logic
// Finds nearest vendors by category and location

async function findNearestVendors(supabase, item, location, limit = 30) {
  try {
    // Determine category from item
    const category = categorizeItem(item);
    
    // Query vendors
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .contains('categories', [category])
      .order('rating', { ascending: false })
      .limit(limit);

    const { data: vendors, error } = await query;

    if (error) throw error;

    // If we have location coordinates, sort by distance
    if (location && vendors) {
      // TODO: Add distance calculation when lat/lng available
      return vendors.slice(0, limit);
    }

    return vendors || [];
  } catch (error) {
    console.error('Error finding vendors:', error);
    return [];
  }
}

function categorizeItem(item) {
  const itemLower = item.toLowerCase();
  
  const categories = {
    'electronics': ['laptop', 'computer', 'phone', 'tablet', 'tv', 'camera', 'electronics'],
    'furniture': ['furniture', 'chair', 'table', 'bed', 'sofa', 'desk'],
    'food': ['food', 'restaurant', 'meal', 'lunch', 'dinner', 'breakfast'],
    'construction': ['cement', 'brick', 'sand', 'iron', 'construction', 'building'],
    'plumbing': ['plumber', 'pipe', 'water', 'sink', 'toilet', 'plumbing'],
    'transport': ['transport', 'taxi', 'bus', 'moto', 'delivery', 'logistics'],
    'fashion': ['clothes', 'fashion', 'dress', 'shirt', 'shoes', 'accessories'],
    'health': ['doctor', 'medicine', 'pharmacy', 'health', 'clinic'],
    'education': ['school', 'course', 'training', 'education', 'tutor']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => itemLower.includes(keyword))) {
      return category;
    }
  }

  return 'general';
}

module.exports = { findNearestVendors, categorizeItem };

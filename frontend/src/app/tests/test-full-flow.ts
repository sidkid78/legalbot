import { getCaseLawService } from '@/lib/legal/caselaw-service';

async function testFullFlow() {
  const service = getCaseLawService();
  
  // Test the search
  const results = await service.searchCaseLaw(
    'contract interpretation',
    'ninth_circuit',
    '2020-01-01',
    undefined,
    3
  );
  
  console.log('📊 Results:', results.count, 'total cases found');
  console.log('📄 Returning:', results.results.length, 'cases\n');
  
  // Show formatted output (what Gemini will see)
  console.log('🤖 Formatted for AI:');
  console.log('='.repeat(80));
  console.log(service.formatResultsForAI(results));
}

testFullFlow();
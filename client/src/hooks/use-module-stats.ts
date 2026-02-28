import { useState, useEffect } from 'react';

export function useModuleStats(data: any[], dateField: string = 'date', numericFields: string[] = []) {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [todayString, setTodayString] = useState('');

  useEffect(() => {
    setTodayString(new Date().toISOString().split('T')[0]);
  }, []);

  const getStats = () => {
    const slicedData = selectedRowIndex !== null ? data.slice(selectedRowIndex) : data;
    
    const stats: any = {
      totalCount: slicedData.length,
      isFiltered: selectedRowIndex !== null,
      todayCount: data.filter(item => item[dateField] === todayString).length,
      historyCount: data.length,
    };

    numericFields.forEach(field => {
      stats[`total${field.charAt(0).toUpperCase() + field.slice(1)}`] = slicedData.reduce((acc, curr) => acc + (Number(curr[field]) || 0), 0);
      stats[`today${field.charAt(0).toUpperCase() + field.slice(1)}`] = data
        .filter(item => item[dateField] === todayString)
        .reduce((acc, curr) => acc + (Number(curr[field]) || 0), 0);
    });

    return stats;
  };

  return {
    selectedRowIndex,
    setSelectedRowIndex,
    stats: getStats(),
  };
}

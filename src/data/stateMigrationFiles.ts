export interface StateMigrationCsvFile {
  year: number;
  filename: string;
  title: string;
  description?: string;
}

export const STATE_MIGRATION_CSV_FILES: StateMigrationCsvFile[] = [
  { year: 2005, filename: 'state_to_state_migrations_table_2005_2005.csv', title: 'State-to-State Migration Flows: 2005' },
  { year: 2006, filename: 'state_to_state_migrations_table_2006_2006.csv', title: 'State-to-State Migration Flows: 2006' },
  { year: 2007, filename: 'state_to_state_migrations_table_2007_2007.csv', title: 'State-to-State Migration Flows: 2007' },
  { year: 2008, filename: 'state_to_state_migrations_table_2008_2008.csv', title: 'State-to-State Migration Flows: 2008' },
  { year: 2009, filename: 'state_to_state_migrations_table_2009_2009.csv', title: 'State-to-State Migration Flows: 2009' },
  { year: 2010, filename: 'state_to_state_migrations_table_2010_2010.csv', title: 'State-to-State Migration Flows: 2010' },
  { year: 2011, filename: 'state_to_state_migrations_table_2011_2011.csv', title: 'State-to-State Migration Flows: 2011' },
  { year: 2012, filename: 'state_to_state_migrations_table_2012_2012.csv', title: 'State-to-State Migration Flows: 2012' },
  { year: 2013, filename: 'state_to_state_migrations_table_2013_2013.csv', title: 'State-to-State Migration Flows: 2013' },
  { year: 2014, filename: 'state_to_state_migrations_table_2014_2014.csv', title: 'State-to-State Migration Flows: 2014' },
  { year: 2015, filename: 'state_to_state_migrations_table_2015_2015.csv', title: 'State-to-State Migration Flows: 2015' },
  { year: 2016, filename: 'state_to_state_migrations_table_2016_2016.csv', title: 'State-to-State Migration Flows: 2016' },
  { year: 2017, filename: 'state_to_state_migrations_table_2017_2017.csv', title: 'State-to-State Migration Flows: 2017' },
  { year: 2018, filename: 'state_to_state_migrations_table_2018_2018.csv', title: 'State-to-State Migration Flows: 2018' },
  { year: 2019, filename: 'state_to_state_migrations_table_2019_2019.csv', title: 'State-to-State Migration Flows: 2019' },
  {
    year: 2021,
    filename: 'state_to_state_migrations_table_2021_2021.csv',
    title: 'State-to-State Migration Flows: 2021',
  },
  {
    year: 2022,
    filename: 'state_to_state_migration_table_2022_t13_updated_2024_06_27_2022.csv',
    title: 'State-to-State Migration Flows: 2022',
    description: 'Updated tabulation (June 2024). The Census Bureau advises caution when comparing Connecticut flows for 2022 with other years.',
  },
  {
    year: 2023,
    filename: 'state_to_state_migration_table_2023_t13_2023.csv',
    title: 'State-to-State Migration Flows: 2023',
  },
];

export const STATE_MIGRATION_MISSING_YEARS = [2020];


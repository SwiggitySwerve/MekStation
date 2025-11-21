import React from 'react';
import Head from 'next/head';
import EquipmentCatalog from '../../components/equipment/EquipmentCatalog';

const EquipmentPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Equipment | BattleTech Editor</title>
      </Head>
      <div className="container mx-auto px-0 sm:px-4"> {/* Adjusted padding for better control */}
        <h1 className="text-2xl sm:text-3xl font-bold my-6 text-gray-800 dark:text-white">Equipment Catalogue</h1>
        <EquipmentCatalog />
      </div>
    </>
  );
};

export default EquipmentPage;

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Simple pagination: Previous, Current / Total, Next
  // A more complex one would render page numbers
  return (
    <div className="my-4 flex items-center justify-center space-x-4">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;

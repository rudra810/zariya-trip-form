document.addEventListener('DOMContentLoaded', () => {
  const sortSelect = document.querySelector('#SortBy');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', () => {
    if (sortSelect.form) {
      sortSelect.form.submit();
    }
  });
});

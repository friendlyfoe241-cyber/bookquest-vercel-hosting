import { Book, AgeGroup } from '@/types/book';

/**
 * Classify a book into an age group based on difficulty and content.
 * beginner → 3-8, intermediate → 8-11, experienced → 12-17+
 * Books can override with explicit ageGroup property.
 */
export function getBookAgeGroup(book: Book): AgeGroup {
  if (book.ageGroup) return book.ageGroup;
  switch (book.difficulty) {
    case 'beginner': return '3-8';
    case 'intermediate': return '8-11';
    case 'experienced': return '12-17+';
    default: return '12-17+';
  }
}

/**
 * Map user-selected age group to the matching book age group.
 * 5-8 → shows 3-8 books, 8-11 → 8-11, 12-17+ → 12-17+
 */
export function userAgeToBookAge(userAge: AgeGroup): AgeGroup {
  if (userAge === '3-8') return '3-8'; // mapped from 5-8 selection
  return userAge;
}

/** Filter books to only those matching the user's age group (strict) */
export function filterBooksByAge(books: Book[], userAgeGroup: AgeGroup): Book[] {
  const targetAge = userAgeToBookAge(userAgeGroup);
  return books.filter(b => getBookAgeGroup(b) === targetAge);
}

/**
 * For the Library page: show all books but sort preferred ones to the top.
 * Exception: age group 3-8 (5-8 users) cannot see 'experienced' difficulty books.
 */
export function libraryBooksForAge(books: Book[], userAgeGroup: AgeGroup): Book[] {
  const targetAge = userAgeToBookAge(userAgeGroup);

  // 3-8 users: hide experienced books entirely
  const visible = targetAge === '3-8'
    ? books.filter(b => b.difficulty !== 'experienced')
    : books;

  // Sort: preferred age-matched books first, then the rest
  return [...visible].sort((a, b) => {
    const aMatch = getBookAgeGroup(a) === targetAge ? 0 : 1;
    const bMatch = getBookAgeGroup(b) === targetAge ? 0 : 1;
    return aMatch - bMatch;
  });
}

/**
 * For the ForYou page: exclude beginner/kids books for older age groups (8-11, 12-17+).
 * Young readers (3-8) only see their own age group.
 */
export function forYouBooksForAge(books: Book[], userAgeGroup: AgeGroup): Book[] {
  const targetAge = userAgeToBookAge(userAgeGroup);

  if (targetAge === '3-8') {
    // Young readers only see beginner books
    return books.filter(b => getBookAgeGroup(b) === '3-8');
  }

  // Older readers (8-11, 12-17+): exclude beginner/kids books
  return books.filter(b => getBookAgeGroup(b) !== '3-8');
}

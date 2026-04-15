export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-4 text-center">
      <p className="text-sm text-gray-500">
        © {new Date().getFullYear()} SAK Lending. All rights reserved.
      </p>
    </footer>
  )
}

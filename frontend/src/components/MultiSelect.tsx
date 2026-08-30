import { useState } from 'react'

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}) {
  const [filter, setFilter] = useState('')
  const visible = filter
    ? options.filter((o) => o.toLowerCase().includes(filter.toLowerCase()))
    : options

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((v) => v !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-700">{label}</label>
        {selected.length > 0 && (
          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
            {selected.length}
          </span>
        )}
      </div>
      {options.length > 8 && (
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filter ${label.toLowerCase()}...`}
          className="mb-1.5 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
      )}
      <div className="max-h-40 overflow-y-auto rounded-md border border-neutral-200 p-1.5">
        {visible.length === 0 && <p className="px-1 py-1 text-xs text-neutral-400">No matches</p>}
        {visible.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
              className="rounded border-neutral-300"
            />
            <span className="truncate">{option}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

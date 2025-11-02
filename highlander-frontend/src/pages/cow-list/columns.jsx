// src/pages/cow-list/columns.jsx
import React from "react"
import { Checkbox } from "../../components/ui/checkbox"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { ArrowUpDown, Archive, Edit2, PlusCircle, Eye } from "lucide-react" // <-- ZMIANA: Trash2 -> Archive

// Funkcje pomocnicze
const ageLabel = (age) => (age === 1 ? 'rok' : (age >= 2 && age <= 4 ? 'lata' : 'lat'));

// Kolory statusów
const statusColors = {
  'ACTIVE': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  'SOLD': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'ARCHIVED': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800',
}

export const getColumns = ({ onEdit, onArchive, onAddEvent, onNavigate }) => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Zaznacz wszystko"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Zaznacz wiersz"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "tag_id",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Kolczyk <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-mono text-emerald-700 dark:text-emerald-300">{row.getValue("tag_id")}</div>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Imię <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  // === NOWA KOLUMNA: STATUS ===
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status")
      const text = status === 'ACTIVE' ? 'Aktywna' : status === 'SOLD' ? 'Sprzedana' : 'Archiwum'
      return <Badge variant="outline" className={statusColors[status] || statusColors['ARCHIVED']}>{text}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "gender",
    header: "Płeć",
    cell: ({ row }) => {
      const gender = row.getValue("gender")
      return <Badge variant={gender === 'F' ? "default" : "secondary"}>{gender === 'F' ? '♀ Samica' : '♂ Samiec'}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "age",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Wiek <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("age")} {ageLabel(row.getValue("age"))}</div>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Akcje</div>,
    cell: ({ row }) => {
      const cow = row.original
      return (
        <div className="flex items-center justify-end space-x-1">
          <Button variant="ghost" size="icon" title="Szczegóły / Historia" onClick={() => onNavigate(cow)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Dodaj zdarzenie" onClick={() => onAddEvent(cow)}>
            <PlusCircle className="h-4 w-4 text-blue-600" />
          </Button>
          <Button variant="ghost" size="icon" title="Edytuj" onClick={() => onEdit(cow)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          {/* === ZMIANA: Przycisk Archiwizacji === */}
          {cow.status === 'ACTIVE' && (
            <Button variant="ghost" size="icon" title="Archiwizuj" className="text-red-600 hover:text-red-700" onClick={() => onArchive(cow)}>
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]

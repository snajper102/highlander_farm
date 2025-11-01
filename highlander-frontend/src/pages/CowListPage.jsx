// src/pages/CowListPage.jsx

import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom'; // <-- IMPORT
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { CowCard } from '../components/CowCard';
import { CowForm } from '../components/CowForm';
import { DeleteCowDialog } from '../components/DeleteCowDialog';
import { AddEventDialog } from '../components/AddEventDialog'; // <-- IMPORT
import { api } from '../services/api';

// Odbieramy context z <Outlet> w App.jsx
export function CowListPage() {
  const { isAddDialogOpen, setIsAddDialogOpen, openAddDialog } = useOutletContext();
  
  const [cows, setCows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stany dialogów lokalnych
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false); // <-- NOWY STAN
  
  const [selectedCow, setSelectedCow] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    fetchCows();
  }, []);

  const fetchCows = async () => {
    try {
      setLoading(true);
      const data = await api.getCows();
      setCows(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeAllDialogs = () => {
    setIsAddDialogOpen(false); 
    setIsEditDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setIsEventDialogOpen(false); // <-- Zamykaj też ten
    setSelectedCow(null);
    setFormError(null);
    setPhotoFile(null); 
  };

  const handleAddCow = async (formData) => {
    try {
      setFormLoading(true);
      setFormError(null);
      const { photo, ...dataToSend } = formData;
      const newCow = await api.createCow(dataToSend);
      if (photoFile && newCow.id) {
        await api.uploadPhoto(newCow.id, photoFile);
      }
      await fetchCows();
      closeAllDialogs();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCow = async (formData) => {
    try {
      setFormLoading(true);
      setFormError(null);
      const { photo, ...dataToSend } = formData;
      const updatedCow = await api.updateCow(selectedCow.id, dataToSend);
      if (photoFile && updatedCow.id) {
        await api.uploadPhoto(updatedCow.id, photoFile);
      }
      await fetchCows();
      closeAllDialogs();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCow = async () => {
    if (!selectedCow) return;
    try {
      setFormLoading(true);
      setFormError(null);
      await api.deleteCow(selectedCow.id);
      await fetchCows();
      closeAllDialogs();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };
  
  // NOWY HANDLER ZDARZENIA
  const handleAddEvent = async (eventData) => {
    try {
      setFormLoading(true);
      setFormError(null);
      await api.createEvent(eventData);
      // Nie musimy odświeżać listy krów, tylko zamykamy modal
      closeAllDialogs();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Openery dialogów
  const openEditDialog = (cow) => {
    setSelectedCow(cow);
    setFormError(null);
    setPhotoFile(null); 
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (cow) => {
    setSelectedCow(cow);
    setFormError(null);
    setPhotoFile(null); 
    setIsDeleteDialogOpen(true);
  };
  
  const openAddEventDialog = (cow) => {
    setSelectedCow(cow);
    setFormError(null);
    setIsEventDialogOpen(true); // <-- Otwórz modal zdarzeń
  };
  
  const getCowCountLabel = () => {
    const count = cows.length;
    if (count === 1) return 'krowa';
    if (count > 1 && count < 5) return 'krowy';
    return 'krów';
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error} - Upewnij się, że backend Django działa na localhost:8000
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex sm:hidden items-center justify-between mb-4">
          <Badge variant="outline" className="text-base px-4 py-2">
            {cows.length} {getCowCountLabel()}
          </Badge>
          <Button onClick={openAddDialog} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Dodaj
          </Button>
        </div>

        {cows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg mb-4">
              Brak krów w bazie danych.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj pierwszą krowę
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cows.map((cow) => (
              <CowCard
                key={cow.id}
                cow={cow}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onAddEvent={openAddEventDialog}
                // onClick jest domyślny (nawigacja)
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Cow Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent onClose={closeAllDialogs}>
          <DialogHeader>
            <DialogTitle>Dodaj nową krowę</DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <CowForm
            onSubmit={handleAddCow}
            onCancel={closeAllDialogs}
            loading={formLoading}
            onPhotoChange={setPhotoFile} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent onClose={closeAllDialogs}>
          <DialogHeader>
            <DialogTitle>Edytuj krowę</DialogTitle>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <CowForm
            cow={selectedCow}
            onSubmit={handleEditCow}
            onCancel={closeAllDialogs}
            loading={formLoading}
            onPhotoChange={setPhotoFile} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <DeleteCowDialog
        cow={selectedCow}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteCow}
        loading={formLoading}
        error={formError}
      />
      
      {/* NOWY Add Event Dialog */}
      <AddEventDialog
        cow={selectedCow}
        open={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        onSubmit={handleAddEvent}
        loading={formLoading}
        error={formError}
      />
    </div>
  );
}

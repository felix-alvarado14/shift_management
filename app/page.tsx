"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Upload, Calendar, Clock } from "lucide-react";

export default function Home() {

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const handleUpload = async (
    e: React.FormEvent<HTMLFormElement>,
    loadType: "P" | "R",
    typeLabel: string
  ) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    formData.append("load_type", loadType);

    try {
      const response = await fetch(`/api/import-load`, {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        setMessage(
          `✓ ${typeLabel} cargado exitosamente - ${data.total_employees_processed} empleados, ${data.total_registries_inserted} registros`
        );
        setMessageType("success");
        setImportResult({
          loadId: data.load_id,
          employeesProcessed: data.total_employees_processed,
          registriesInserted: data.total_registries_inserted,
          type: typeLabel,
        });
        formElement.reset();
      } else {
        setMessage(`Error: ${data.message || "Error al subir archivo"}`);
        setMessageType("error");
        setImportResult(null);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage("Error al conectar con el servidor");
      setMessageType("error");
      setImportResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Sistema de Gestión de Turnos
          </h1>
          <p className="text-slate-600">
            Carga y gestiona los horarios planificados y reales de tu equipo
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Message Alert */}
        {message && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 border ${
            messageType === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {messageType === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{message}</span>
          </div>
        )}

        {/* Import Result Display */}
        {importResult && messageType === "success" && (
          <div className="mb-8 bg-white rounded-xl shadow-md border border-slate-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Importación Completada
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Load ID: <span className="font-medium">#{importResult.loadId}</span> | 
                  Tipo: <span className="font-medium">{importResult.type}</span>
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Empleados Procesados</p>
                <p className="text-2xl font-bold text-slate-900">{importResult.employeesProcessed}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Registros Insertados</p>
                <p className="text-2xl font-bold text-slate-900">{importResult.registriesInserted}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Forms Grid */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* Planned Shifts Form */}
          <form onSubmit={(e) => handleUpload(e, "P", "Horario Planificado")}
                className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-slate-200">

            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Horario Planificado
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Carga el archivo con los turnos planificados
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Año
                </label>
                <input
                  type="number"
                  name="load_year"
                  min="2020"
                  max="2100"
                  required
                  disabled={isLoading}
                  defaultValue={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mes
                </label>
                <select
                  name="load_month"
                  required
                  disabled={isLoading}
                  defaultValue={new Date().getMonth() + 1}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                >
                  <option value="">Seleccionar...</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-2">
                  Archivo Excel
                </span>
                <input
                  type="file"
                  name="file"
                  accept=".xlsx,.xls"
                  required
                  disabled={isLoading}
                  className="block w-full text-sm text-slate-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-600
                    hover:file:bg-blue-100
                    disabled:file:bg-slate-100 disabled:file:text-slate-600
                    cursor-pointer"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {isLoading ? "Procesando..." : "Subir Archivo"}
            </button>
          </form>

          {/* Actual Shifts Form */}
          <form onSubmit={(e) => handleUpload(e, "R", "Horario Real")}
                className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-slate-200">

            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Horario Real
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Carga el archivo con los turnos realizados
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Año
                </label>
                <input
                  type="number"
                  name="load_year"
                  min="2020"
                  max="2100"
                  required
                  disabled={isLoading}
                  defaultValue={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mes
                </label>
                <select
                  name="load_month"
                  required
                  disabled={isLoading}
                  defaultValue={new Date().getMonth() + 1}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-slate-100"
                >
                  <option value="">Seleccionar...</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-2">
                  Archivo Excel
                </span>
                <input
                  type="file"
                  name="file"
                  accept=".xlsx,.xls"
                  required
                  disabled={isLoading}
                  className="block w-full text-sm text-slate-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-green-50 file:text-green-600
                    hover:file:bg-green-100
                    disabled:file:bg-slate-100 disabled:file:text-slate-600
                    cursor-pointer"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {isLoading ? "Procesando..." : "Subir Archivo"}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}
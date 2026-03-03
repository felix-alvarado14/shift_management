"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Upload, Calendar, Clock, Download, Eye } from "lucide-react";

export default function Home() {

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [showJson, setShowJson] = useState(false);

  const handleUpload = async (
    e: React.FormEvent<HTMLFormElement>,
    type: "planned" | "actual"
  ) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    try {
      const response = await fetch(`/api/test-read`, {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        setMessage(`Archivo cargado exitosamente - ${data.rowCount} filas procesadas`);
        setMessageType("success");
        setParsedData(data);
        setShowJson(false);
        formElement.reset();
      } else {
        setMessage(`Error: ${data.message || "Error al subir archivo"}`);
        setMessageType("error");
        setParsedData(null);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage("Error al conectar con el servidor");
      setMessageType("error");
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

        {/* Parsed Data Display */}
        {parsedData && messageType === "success" && (
          <div className="mb-8 bg-white rounded-xl shadow-md border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Datos Procesados
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Archivo: <span className="font-medium">{parsedData.fileName}</span> | 
                  Hoja: <span className="font-medium">{parsedData.sheetName}</span> |
                  Empleados: <span className="font-medium">{parsedData.employeeCount}</span>
                </p>
              </div>
              <button
                onClick={() => setShowJson(!showJson)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                {showJson ? <Eye className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {showJson ? "Ver Tabla" : "Ver JSON"}
              </button>
            </div>

            {showJson ? (
              // JSON View
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-slate-100 font-mono text-sm">
                  {JSON.stringify(
                    {
                      fileName: parsedData.fileName,
                      sheetName: parsedData.sheetName,
                      employeeCount: parsedData.employeeCount,
                      data: parsedData.data,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            ) : (
              // Table View
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        Iniciales
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">
                        Días Registrados
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.data.map((employee: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {employee.employee_id}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {employee.employee_initials}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {employee.employee_name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                            {Object.keys(employee.days).length} días
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 text-sm text-slate-600">
              Total de empleados: <span className="font-semibold text-slate-900">{parsedData.employeeCount}</span>
            </div>
          </div>
        )}

        {/* Upload Forms Grid */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* Planned Shifts Form */}
          <form onSubmit={(e) => handleUpload(e, "planned")}
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

            <div className="mb-6">
              <label className="block">
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
              {isLoading ? "Subiendo..." : "Subir Archivo"}
            </button>
          </form>

          {/* Actual Shifts Form */}
          <form onSubmit={(e) => handleUpload(e, "actual")}
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

            <div className="mb-6">
              <label className="block">
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
              {isLoading ? "Subiendo..." : "Subir Archivo"}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}
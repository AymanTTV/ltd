// src/components/settings/RolePermissions.tsx
import React from 'react'
import Badge from '../ui/Badge'
import { DEFAULT_PERMISSIONS } from '../../types/roles'

export default function RolePermissions() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Role Permissions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Can View Modules
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(DEFAULT_PERMISSIONS).map(([role, perms]) => {
                // gather all modules where .view is true
                const viewable = Object.entries(perms)
                  .filter(([_, p]) => p.view)
                  .map(([moduleName]) =>
                    // capitalize first letter
                    moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
                  )

                return (
                  <tr key={role}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {viewable.map(mod => (
                          <Badge key={mod} variant="primary">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

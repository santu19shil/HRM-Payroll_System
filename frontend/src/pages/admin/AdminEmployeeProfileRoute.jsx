import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminEmployeeProfile from './AdminEmployeeProfile';

export default function AdminEmployeeProfileRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    open && (
      <AdminEmployeeProfile
        employeeId={id}
        onClose={() => {
          setOpen(false);
          navigate('/admin/employees');
        }}
      />
    )
  );
}


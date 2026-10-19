import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../lib/api';
import { ACCENTS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, EmptyState, Field, Modal, Spinner } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Admin() {
  const { reloadProjects } = useOutletContext();
  const { profile: me } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('clients');
  const [clients, setClients] = useState(null);
  const [people, setPeople] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([api.listClients(), api.listProfiles()]);
      setClients(c);
      setPeople(p);
    } catch (e) {
      toast.error(e.message);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, msg) => {
    try {
      await fn();
      if (msg) toast.success(msg);
      await load();
      reloadProjects();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!clients || !people) return <Spinner />;
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const clientPeople = people.filter((p) => p.role === 'client');

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Staff only</div>
          <h1>Clients & people</h1>
          <p className="muted">Set up client workspaces, projects and who can see them.</p>
        </div>
        <div className="row-gap">
          <button className="btn" onClick={() => setModal({ type: 'client' })}><Icon name="plus" size={15} /> New client</button>
          <button className="btn btn-primary" onClick={() => setModal({ type: 'project' })} disabled={!clients.length}><Icon name="plus" size={15} /> New project</button>
        </div>
      </header>

      <nav className="tabs tabs-flat" aria-label="Admin sections">
        <button className={`tab ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}><Icon name="folder" size={15} /> Clients <span className="count">{clients.length}</span></button>
        <button className={`tab ${tab === 'people' ? 'active' : ''}`} onClick={() => setTab('people')}><Icon name="users" size={15} /> People <span className="count">{people.length}</span></button>
      </nav>

      {tab === 'clients' &&
        (clients.length === 0 ? (
          <EmptyState icon="folder" title="No clients yet" action={<button className="btn btn-primary" onClick={() => setModal({ type: 'client' })}>Create your first client</button>} />
        ) : (
          <div className="client-list">
            {clients.map((c) => {
              const memberIds = c.client_members.map((m) => m.user_id);
              const addable = clientPeople.filter((p) => !memberIds.includes(p.id));
              return (
                <article key={c.id} className="card client-card" style={{ '--accent': c.accent_color }}>
                  <div className="client-card-head">
                    <span className="client-swatch" />
                    <h2>{c.name}</h2>
                    <button className="icon-btn" onClick={() => setModal({ type: 'client', client: c })} aria-label={`Edit ${c.name}`}><Icon name="settings" size={15} /></button>
                  </div>
                  <div className="client-cols">
                    <div>
                      <div className="section-label">Projects</div>
                      {c.projects.length === 0 && <div className="muted small">No projects yet.</div>}
                      {c.projects.map((p) => (
                        <Link key={p.id} to={`/p/${p.id}`} className="client-project">
                          <span className="truncate">{p.name}</span>
                          <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>
                        </Link>
                      ))}
                      <button className="link-btn small" onClick={() => setModal({ type: 'project', clientId: c.id })}><Icon name="plus" size={13} /> Add project</button>
                    </div>
                    <div>
                      <div className="section-label">Client logins</div>
                      {memberIds.length === 0 && <div className="muted small">Nobody from this client can sign in yet.</div>}
                      {memberIds.map((id) => byId[id] && (
                        <div key={id} className="member-row">
                          <Avatar profile={byId[id]} size={24} />
                          <span className="member-text">
                            <span className="truncate">{byId[id].full_name}</span>
                            <span className="small muted truncate">{byId[id].email}</span>
                          </span>
                          <button className="link-btn small" onClick={() => run(() => api.removeMember(c.id, id), 'Access removed')}>Remove</button>
                        </div>
                      ))}
                      {addable.length > 0 && (
                        <select
                          className="select-sm"
                          value=""
                          aria-label={`Give a client login access to ${c.name}`}
                          onChange={(e) => e.target.value && run(() => api.addMember(c.id, e.target.value), 'Access granted')}
                        >
                          <option value="">+ Give access to…</option>
                          {addable.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}

      {tab === 'people' && (
        <section className="card">
          <div className="callout">
            <Icon name="key" size={16} />
            <span>
              <strong>Adding someone new:</strong> create their login in Supabase → Authentication → <em>Add user</em> (tick “Auto confirm”), then send them the portal link and password. They appear here as a client — switch them to Team if they work at CodeSync, or give them access to a client on the Clients tab.
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Person</th><th>Role</th><th>Client access</th></tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const access = clients.filter((c) => c.client_members.some((m) => m.user_id === p.id));
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="member-row">
                          <Avatar profile={p} size={28} />
                          <span className="member-text">
                            <span>{p.full_name} {p.id === me?.id && <span className="muted small">(you)</span>}</span>
                            <span className="small muted">{p.email}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <select
                          className="select-sm"
                          value={p.role}
                          disabled={p.id === me?.id}
                          aria-label={`Role for ${p.full_name}`}
                          onChange={(e) => run(() => api.setRole(p.id, e.target.value), 'Role updated')}
                        >
                          <option value="staff">Team (can edit)</option>
                          <option value="client">Client (view & comment)</option>
                        </select>
                      </td>
                      <td>
                        {p.role === 'staff' ? (
                          <span className="muted small">All projects</span>
                        ) : access.length ? (
                          <div className="chips">{access.map((c) => <span key={c.id} className="chip" style={{ '--accent': c.accent_color }}><span className="side-dot" style={{ background: c.accent_color }} />{c.name}</span>)}</div>
                        ) : (
                          <span className="small text-warn">No access yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {modal?.type === 'client' && (
        <ClientModal
          client={modal.client}
          onClose={() => setModal(null)}
          onSave={(fields) =>
            run(() => (modal.client ? api.updateClient(modal.client.id, fields) : api.createClient(fields)), modal.client ? 'Client updated' : 'Client created').then(() => setModal(null))
          }
        />
      )}
      {modal?.type === 'project' && (
        <ProjectModal
          clients={clients}
          clientId={modal.clientId}
          onClose={() => setModal(null)}
          onSave={(fields) => run(() => api.createProject(fields), 'Project created').then(() => setModal(null))}
        />
      )}
    </div>
  );
}

function ClientModal({ client, onClose, onSave }) {
  const [name, setName] = useState(client?.name || '');
  const [accent, setAccent] = useState(client?.accent_color || ACCENTS[0]);
  return (
    <Modal
      title={client ? 'Edit client' : 'New client'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), accent_color: accent })}>{client ? 'Save' : 'Create client'}</button>
        </>
      }
    >
      <div className="stack">
        <Field label="Client name" htmlFor="cl-name"><input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TCG Marketplace" /></Field>
        <Field label="Brand colour" hint="Used as the accent throughout this client’s portal.">
          <div className="swatches" role="radiogroup" aria-label="Brand colour">
            {ACCENTS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={accent === c} aria-label={c} className={`swatch ${accent === c ? 'is-on' : ''}`} style={{ background: c }} onClick={() => setAccent(c)} />
            ))}
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Custom colour" className="swatch-custom" />
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function ProjectModal({ clients, clientId, onClose, onSave }) {
  const [f, setF] = useState({ client_id: clientId || clients[0]?.id, name: '', summary: '', start_date: '', end_date: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal
      title="New project"
      width={520}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!f.name.trim() || !f.client_id}
            onClick={() => onSave({ ...f, name: f.name.trim(), start_date: f.start_date || null, end_date: f.end_date || null })}
          >
            Create project
          </button>
        </>
      }
    >
      <div className="stack">
        <Field label="Client" htmlFor="np-c">
          <select id="np-c" value={f.client_id} onChange={set('client_id')}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Project name" htmlFor="np-n"><input id="np-n" value={f.name} onChange={set('name')} placeholder="e.g. Marketplace Phase 1" /></Field>
        <Field label="Summary" htmlFor="np-s"><textarea id="np-s" rows={2} value={f.summary} onChange={set('summary')} placeholder="One or two sentences the client will see." /></Field>
        <div className="grid-2">
          <Field label="Start date" htmlFor="np-sd"><input id="np-sd" type="date" value={f.start_date} onChange={set('start_date')} /></Field>
          <Field label="Target end date" htmlFor="np-ed"><input id="np-ed" type="date" value={f.end_date} onChange={set('end_date')} /></Field>
        </div>
      </div>
    </Modal>
  );
}

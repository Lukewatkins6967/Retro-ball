using UnityEngine.Scripting;

namespace UnityEngine
{
	internal class SendMouseEvents
	{
		private struct HitInfo
		{
			public GameObject target;

			public Camera camera;

			public void SendMessage(string name)
			{
				target.SendMessage(name, null, SendMessageOptions.DontRequireReceiver);
			}

			public static bool Compare(HitInfo lhs, HitInfo rhs)
			{
				return lhs.target == rhs.target && lhs.camera == rhs.camera;
			}

			public static implicit operator bool(HitInfo exists)
			{
				return exists.target != null && exists.camera != null;
			}
		}

		private const int m_HitIndexGUI = 0;

		private const int m_HitIndexPhysics3D = 1;

		private const int m_HitIndexPhysics2D = 2;

		private static bool s_MouseUsed = false;

		private static readonly HitInfo[] m_LastHit = new HitInfo[3]
		{
			default(HitInfo),
			default(HitInfo),
			default(HitInfo)
		};

		private static readonly HitInfo[] m_MouseDownHit = new HitInfo[3]
		{
			default(HitInfo),
			default(HitInfo),
			default(HitInfo)
		};

		private static readonly HitInfo[] m_CurrentHit = new HitInfo[3]
		{
			default(HitInfo),
			default(HitInfo),
			default(HitInfo)
		};

		private static Camera[] m_Cameras;

		[RequiredByNativeCode]
		private static void SetMouseMoved()
		{
			s_MouseUsed = true;
		}

		[RequiredByNativeCode]
		private static void DoSendMouseEvents(int skipRTCameras)
		{
			Vector3 mousePosition = Input.mousePosition;
			int allCamerasCount = Camera.allCamerasCount;
			if (m_Cameras == null || m_Cameras.Length != allCamerasCount)
			{
				m_Cameras = new Camera[allCamerasCount];
			}
			Camera.GetAllCameras(m_Cameras);
			for (int i = 0; i < m_CurrentHit.Length; i++)
			{
				m_CurrentHit[i] = default(HitInfo);
			}
			if (!s_MouseUsed)
			{
				Camera[] cameras = m_Cameras;
				foreach (Camera camera in cameras)
				{
					if (camera == null || (skipRTCameras != 0 && camera.targetTexture != null) || !camera.pixelRect.Contains(mousePosition))
					{
						continue;
					}
					GUILayer component = camera.GetComponent<GUILayer>();
					if ((bool)component)
					{
						GUIElement gUIElement = component.HitTest(mousePosition);
						if ((bool)gUIElement)
						{
							m_CurrentHit[0].target = gUIElement.gameObject;
							m_CurrentHit[0].camera = camera;
						}
						else
						{
							m_CurrentHit[0].target = null;
							m_CurrentHit[0].camera = null;
						}
					}
					if (camera.eventMask != 0)
					{
						Ray ray = camera.ScreenPointToRay(mousePosition);
						float z = ray.direction.z;
						float distance = ((!Mathf.Approximately(0f, z)) ? Mathf.Abs((camera.farClipPlane - camera.nearClipPlane) / z) : float.PositiveInfinity);
						GameObject gameObject = camera.RaycastTry(ray, distance, camera.cullingMask & camera.eventMask);
						if (gameObject != null)
						{
							m_CurrentHit[1].target = gameObject;
							m_CurrentHit[1].camera = camera;
						}
						else if (camera.clearFlags == CameraClearFlags.Skybox || camera.clearFlags == CameraClearFlags.Color)
						{
							m_CurrentHit[1].target = null;
							m_CurrentHit[1].camera = null;
						}
						GameObject gameObject2 = camera.RaycastTry2D(ray, distance, camera.cullingMask & camera.eventMask);
						if (gameObject2 != null)
						{
							m_CurrentHit[2].target = gameObject2;
							m_CurrentHit[2].camera = camera;
						}
						else if (camera.clearFlags == CameraClearFlags.Skybox || camera.clearFlags == CameraClearFlags.Color)
						{
							m_CurrentHit[2].target = null;
							m_CurrentHit[2].camera = null;
						}
					}
				}
			}
			for (int k = 0; k < m_CurrentHit.Length; k++)
			{
				SendEvents(k, m_CurrentHit[k]);
			}
			s_MouseUsed = false;
		}

		private static void SendEvents(int i, HitInfo hit)
		{
			bool mouseButtonDown = Input.GetMouseButtonDown(0);
			bool mouseButton = Input.GetMouseButton(0);
			if (mouseButtonDown)
			{
				if ((bool)hit)
				{
					m_MouseDownHit[i] = hit;
					m_MouseDownHit[i].SendMessage("OnMouseDown");
				}
			}
			else if (!mouseButton)
			{
				if ((bool)m_MouseDownHit[i])
				{
					if (HitInfo.Compare(hit, m_MouseDownHit[i]))
					{
						m_MouseDownHit[i].SendMessage("OnMouseUpAsButton");
					}
					m_MouseDownHit[i].SendMessage("OnMouseUp");
					m_MouseDownHit[i] = default(HitInfo);
				}
			}
			else if ((bool)m_MouseDownHit[i])
			{
				m_MouseDownHit[i].SendMessage("OnMouseDrag");
			}
			if (HitInfo.Compare(hit, m_LastHit[i]))
			{
				if ((bool)hit)
				{
					hit.SendMessage("OnMouseOver");
				}
			}
			else
			{
				if ((bool)m_LastHit[i])
				{
					m_LastHit[i].SendMessage("OnMouseExit");
				}
				if ((bool)hit)
				{
					hit.SendMessage("OnMouseEnter");
					hit.SendMessage("OnMouseOver");
				}
			}
			m_LastHit[i] = hit;
		}
	}
}

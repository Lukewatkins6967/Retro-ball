using System;
using System.Collections.Generic;

namespace UnityEngine.EventSystems
{
	[RequireComponent(typeof(Camera))]
	[AddComponentMenu("Event/Physics Raycaster")]
	public class PhysicsRaycaster : BaseRaycaster
	{
		protected const int kNoEventMaskSet = -1;

		protected Camera m_EventCamera;

		[SerializeField]
		protected LayerMask m_EventMask = -1;

		public override Camera eventCamera
		{
			get
			{
				if (m_EventCamera == null)
				{
					m_EventCamera = GetComponent<Camera>();
				}
				return m_EventCamera ?? Camera.main;
			}
		}

		public virtual int depth
		{
			get
			{
				return (!(eventCamera != null)) ? 16777215 : ((int)eventCamera.depth);
			}
		}

		public int finalEventMask
		{
			get
			{
				return (!(eventCamera != null)) ? (-1) : (eventCamera.cullingMask & (int)m_EventMask);
			}
		}

		public LayerMask eventMask
		{
			get
			{
				return m_EventMask;
			}
			set
			{
				m_EventMask = value;
			}
		}

		protected PhysicsRaycaster()
		{
		}

		public override void Raycast(PointerEventData eventData, List<RaycastResult> resultAppendList)
		{
			if (eventCamera == null)
			{
				return;
			}
			Ray ray = eventCamera.ScreenPointToRay(eventData.position);
			float maxDistance = eventCamera.farClipPlane - eventCamera.nearClipPlane;
			RaycastHit[] array = Physics.RaycastAll(ray, maxDistance, finalEventMask);
			if (array.Length > 1)
			{
				Array.Sort(array, (RaycastHit r1, RaycastHit r2) => r1.distance.CompareTo(r2.distance));
			}
			if (array.Length != 0)
			{
				int num = 0;
				for (int num2 = array.Length; num < num2; num++)
				{
					RaycastResult item = new RaycastResult
					{
						gameObject = array[num].collider.gameObject,
						module = this,
						distance = array[num].distance,
						worldPosition = array[num].point,
						worldNormal = array[num].normal,
						screenPosition = eventData.position,
						index = resultAppendList.Count,
						sortingLayer = 0,
						sortingOrder = 0
					};
					resultAppendList.Add(item);
				}
			}
		}
	}
}

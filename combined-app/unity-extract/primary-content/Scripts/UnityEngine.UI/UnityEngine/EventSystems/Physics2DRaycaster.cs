using System.Collections.Generic;

namespace UnityEngine.EventSystems
{
	[RequireComponent(typeof(Camera))]
	[AddComponentMenu("Event/Physics 2D Raycaster")]
	public class Physics2DRaycaster : PhysicsRaycaster
	{
		protected Physics2DRaycaster()
		{
		}

		public override void Raycast(PointerEventData eventData, List<RaycastResult> resultAppendList)
		{
			if (eventCamera == null)
			{
				return;
			}
			Ray ray = eventCamera.ScreenPointToRay(eventData.position);
			float distance = eventCamera.farClipPlane - eventCamera.nearClipPlane;
			RaycastHit2D[] rayIntersectionAll = Physics2D.GetRayIntersectionAll(ray, distance, base.finalEventMask);
			if (rayIntersectionAll.Length != 0)
			{
				int i = 0;
				for (int num = rayIntersectionAll.Length; i < num; i++)
				{
					SpriteRenderer component = rayIntersectionAll[i].collider.gameObject.GetComponent<SpriteRenderer>();
					RaycastResult item = new RaycastResult
					{
						gameObject = rayIntersectionAll[i].collider.gameObject,
						module = this,
						distance = Vector3.Distance(eventCamera.transform.position, rayIntersectionAll[i].transform.position),
						worldPosition = rayIntersectionAll[i].point,
						worldNormal = rayIntersectionAll[i].normal,
						screenPosition = eventData.position,
						index = resultAppendList.Count,
						sortingLayer = ((component != null) ? component.sortingLayerID : 0),
						sortingOrder = ((component != null) ? component.sortingOrder : 0)
					};
					resultAppendList.Add(item);
				}
			}
		}
	}
}

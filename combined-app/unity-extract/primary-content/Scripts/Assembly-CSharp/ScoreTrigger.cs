using UnityEngine;

public class ScoreTrigger : MonoBehaviour
{
	private void OnTriggerEnter(Collider collider)
	{
		if (collider.gameObject.layer == 11)
		{
			Singleton<SystemGame>.Get.OnBallScored(collider.gameObject.GetComponent<Basketball>(), base.transform.parent.GetComponent<Hoop>());
		}
	}
}
